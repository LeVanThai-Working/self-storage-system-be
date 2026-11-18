import crypto from 'node:crypto';
import { mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { getCloudinaryConfig } from '../../src/config/cloudinary.config.ts';

export const FINANCE_ASSET_FOLDER =
  'self-storage/seed/module-seed-v1/milestone-5';
export const RENDER_BASE = 'https://self-storage-system-be.onrender.com';
export type FinanceDocument = {
  key: string;
  title: string;
  lines: string[];
  sourceHash: string;
  publicId: string;
};
export type FinanceAsset = {
  key: string;
  sourceHash: string;
  publicId: string;
  url: string;
  fileHash: string;
  uploadedAt: string;
  verifiedAt: string;
};
export type FinanceAssetMap = Record<string, FinanceAsset>;
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

const escapeXml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[c]!
  );
export const sha256 = (value: string | Buffer) =>
  crypto.createHash('sha256').update(value).digest('hex');

export function renderSeedDocument(spec: { title: string; lines: string[] }) {
  const lines = [spec.title, ...spec.lines];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1754" viewBox="0 0 1240 1754">
<rect width="1240" height="1754" fill="white"/>
<rect x="55" y="55" width="1130" height="1644" fill="none" stroke="#334155" stroke-width="3"/>
<g font-family="Arial, sans-serif" fill="#0f172a">
<text x="95" y="125" font-size="30" font-weight="bold" fill="#b91c1c">DỮ LIỆU SEED — KHÔNG CÓ GIÁ TRỊ GIAO DỊCH</text>
${lines.map((line, index) => `<text x="95" y="${230 + index * 65}" font-size="${index === 0 ? 30 : 25}">${escapeXml(line)}</text>`).join('\n')}
<text x="95" y="1550" font-size="25">XÁC NHẬN MÔ PHỎNG — KHÔNG PHẢI CHỮ KÝ THẬT</text>
<text x="95" y="1620" font-size="21">Tài liệu kiểm tra dữ liệu Milestone 5 của Storage Hub.</text>
</g></svg>`;
}

export function financeDocument(
  key: string,
  title: string,
  lines: string[]
): FinanceDocument {
  const sourceHash = sha256(renderSeedDocument({ title, lines }));
  return {
    key,
    title,
    lines,
    sourceHash,
    publicId: `${FINANCE_ASSET_FOLDER}/${key}-${sourceHash.slice(0, 16)}`,
  };
}

// Extract only JSON data. Never evaluate the JavaScript supplied by a remote server.
function swaggerDocument(source: string): unknown {
  const marker = /\b(?:var|let|const)\s+options\s*=\s*\{/.exec(source);
  if (!marker) throw new Error('RENDER_SWAGGER_MISSING');
  const start = source.indexOf('{', marker.index);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) {
      const parsed: unknown = JSON.parse(source.slice(start, i + 1));
      if (parsed && typeof parsed === 'object' && 'swaggerDoc' in parsed)
        return parsed.swaggerDoc;
      break;
    }
  }
  throw new Error('RENDER_SWAGGER_INVALID');
}

export async function checkRenderFinanceReadiness(
  fetcher: Fetcher = fetch,
  facilities = [
    { code: 'Q1', id: '48fa6b80212da7b5f07cc776' },
    { code: 'Q2', id: '892251e4fbbe95999059c73f' },
    { code: 'Q3', id: 'c69f6ec991de74f0ce721da0' },
    { code: 'Q4', id: '19bffba08d515cd4f4936ab3' },
    { code: 'Q5', id: '8cb45b3603be5cd9bb878db2' },
  ]
): Promise<{ ready: boolean; reason?: string; checkedAt: string }> {
  const checkedAt = new Date().toISOString();
  if (
    facilities.length !== 5 ||
    new Set(facilities.map((f) => f.code)).size !== 5 ||
    !['Q1', 'Q2', 'Q3', 'Q4', 'Q5'].every((code) =>
      facilities.some((f) => f.code === code)
    )
  )
    return {
      ready: false,
      reason: 'RENDER_FIVE_FACILITIES_REQUIRED',
      checkedAt,
    };
  try {
    const specResponse = await fetcher(
      `${RENDER_BASE}/api-docs/swagger-ui-init.js`,
      { signal: AbortSignal.timeout(45000) }
    );
    if (!specResponse.ok)
      return {
        ready: false,
        reason: `SWAGGER_HTTP_${specResponse.status}`,
        checkedAt,
      };
    const spec = swaggerDocument(await specResponse.text()) as {
      components?: {
        schemas?: Record<
          string,
          {
            $ref?: string;
            properties?: Record<string, { nullable?: boolean; type?: string }>;
          }
        >;
      };
    };
    const schemas = spec?.components?.schemas;
    let schema = schemas?.StorageUnitResponse;
    for (let n = 0; schema?.$ref && n < 8; n++)
      schema = schemas?.[schema.$ref.split('/').at(-1)!];
    const floorSchema = schema?.properties?.floor;
    if (
      !floorSchema ||
      !['number', 'integer'].includes(floorSchema.type ?? '') ||
      floorSchema.nullable === true
    )
      return { ready: false, reason: 'RENDER_FLOOR_NOT_NUMERIC', checkedAt };
    for (const facility of facilities) {
      const response = await fetcher(
        `${RENDER_BASE}/storage-units/facility/${facility.id}/map-layout`,
        { signal: AbortSignal.timeout(45000) }
      );
      if (!response.ok)
        return {
          ready: false,
          reason: `${facility.code}_MAP_HTTP_${response.status}`,
          checkedAt,
        };
      const body = (await response.json()) as {
        success?: boolean;
        data?: { unitNumber?: string; floor?: number }[];
      };
      if (
        !body.success ||
        !Array.isArray(body.data) ||
        !body.data.some(
          (unit) =>
            unit.unitNumber === `${facility.code}-KHO-01` && unit.floor === 1
        ) ||
        body.data.some(
          (unit) => !Number.isInteger(unit.floor) || (unit.floor ?? 0) < 1
        )
      )
        return {
          ready: false,
          reason: `${facility.code}_FLOOR_INVALID`,
          checkedAt,
        };
    }
    return { ready: true, checkedAt };
  } catch {
    return { ready: false, reason: 'RENDER_CHECK_FAILED', checkedAt };
  }
}

export type FinanceAssetProvider = {
  securePrefix: string;
  lookup(publicId: string): Promise<string | null>;
  upload(spec: FinanceDocument): Promise<string>;
};

export function cloudinaryFinanceProvider(): FinanceAssetProvider {
  const config = getCloudinaryConfig();
  cloudinary.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true,
  });
  return {
    securePrefix: `https://res.cloudinary.com/${config.cloudName}/image/upload/`,
    async lookup(publicId) {
      try {
        return (
          await cloudinary.api.resource(publicId, { resource_type: 'image' })
        ).secure_url as string;
      } catch (error) {
        // The Admin SDK wraps HTTP errors, while some transports return the error directly.
        const responseError =
          error && typeof error === 'object' && 'error' in error
            ? error.error
            : error;
        if (
          responseError &&
          typeof responseError === 'object' &&
          'http_code' in responseError &&
          responseError.http_code === 404
        )
          return null;
        throw new Error('FINANCE_ASSET_LOOKUP_FAILED', { cause: error });
      }
    },
    async upload(spec) {
      try {
        const result = await cloudinary.uploader.upload(
          `data:image/svg+xml;base64,${Buffer.from(renderSeedDocument(spec)).toString('base64')}`,
          {
            public_id: spec.publicId,
            resource_type: 'image',
            format: 'png',
            overwrite: false,
            context: { seed: 'module-seed-v1:5', source_hash: spec.sourceHash },
          }
        );
        return result.secure_url;
      } catch (error) {
        throw new Error('FINANCE_ASSET_UPLOAD_FAILED', { cause: error });
      }
    },
  };
}

export async function verifyFinanceAsset(
  url: string,
  prefix: string,
  fetcher: Fetcher = fetch
) {
  if (!url.startsWith(prefix) || new URL(url).protocol !== 'https:')
    throw new Error('FINANCE_ASSET_URL_INVALID');
  const response = await fetcher(url, {
    signal: AbortSignal.timeout(30000),
    redirect: 'error',
  });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.startsWith('image/png')
  )
    throw new Error('FINANCE_ASSET_NOT_PNG');
  const size = Number(response.headers.get('content-length'));
  if (size > 5 * 1024 * 1024) throw new Error('FINANCE_ASSET_TOO_LARGE');
  const data = Buffer.from(await response.arrayBuffer());
  if (
    data.length > 5 * 1024 * 1024 ||
    data.length < 24 ||
    !data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    throw new Error('FINANCE_ASSET_INVALID_IMAGE');
  return sha256(data);
}

export async function prepareFinanceAssets(
  specs: FinanceDocument[],
  manifestFile: string,
  provider: FinanceAssetProvider,
  fetcher: Fetcher = fetch
): Promise<FinanceAssetMap> {
  let manifest: FinanceAssetMap = {};
  try {
    manifest = JSON.parse(
      await readFile(manifestFile, 'utf8')
    ) as FinanceAssetMap;
  } catch (error) {
    if (!(
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'ENOENT'
    ))
      throw new Error('FINANCE_ASSET_MANIFEST_INVALID', { cause: error });
  }
  await mkdir(path.dirname(manifestFile), { recursive: true });
  for (const spec of specs) {
    const previous = manifest[spec.key];
    if (
      previous &&
      (previous.sourceHash !== spec.sourceHash ||
        previous.publicId !== spec.publicId)
    )
      throw new Error('FINANCE_ASSET_CONTENT_CHANGED');
    const url =
      previous?.url ??
      (await provider.lookup(spec.publicId)) ??
      (await provider.upload(spec));
    const fileHash = await verifyFinanceAsset(
      url,
      provider.securePrefix,
      fetcher
    );
    if (previous && previous.fileHash !== fileHash)
      throw new Error('FINANCE_ASSET_CHECKSUM_CHANGED');
    const now = new Date().toISOString();
    manifest[spec.key] = {
      key: spec.key,
      sourceHash: spec.sourceHash,
      publicId: spec.publicId,
      url,
      fileHash,
      uploadedAt: previous?.uploadedAt ?? now,
      verifiedAt: now,
    };
    const temporary = `${manifestFile}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(manifest, null, 2), {
      flag: 'wx',
      mode: 0o600,
    });
    if (!(await stat(temporary)).size)
      throw new Error('FINANCE_ASSET_MANIFEST_EMPTY');
    await rename(temporary, manifestFile);
  }
  return Object.fromEntries(
    specs.map((spec) => [spec.key, manifest[spec.key]])
  );
}
