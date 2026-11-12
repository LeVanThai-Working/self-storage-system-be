import type { IContract, IContractAddendum } from '../contract.model.ts';
import type { IFacility } from '../../facility/facility.model.ts';
import type { IUser } from '../../user/user.model.ts';
import type { IProfile } from '../../profile/profile.model.ts';
import type { ILegalEntity } from '../../legalEntity/legalEntity.model.ts';
import type { ISigningAuthorization } from '../../signingAuthorization/signingAuthorization.model.ts';
import type { IStorageUnit } from '../../storageUnit/storageUnit.model.ts';
import type { IStorageRack } from '../../storageRack/storageRack.model.ts';
import {
  ContractAddendumStatusEnum,
  ContractAddendumTypeEnum,
} from '../../../common/enums/contract.enum.ts';
import { getVNDateString } from '../../../utils/date.util.ts';

export interface ContractPdfContext {
  contract: IContract;
  facility?: IFacility | null;
  customer?: IUser | null;
  profile?: IProfile | null;
  legalEntity?: ILegalEntity | null;
  signingAuth?: ISigningAuthorization | null;
  storageUnit?: IStorageUnit | null;
}

export interface ContractAddendumPdfContext extends ContractPdfContext {
  addendum: IContractAddendum;
  previousStorageUnit?: IStorageUnit | null;
  newStorageUnit?: IStorageUnit | null;
  previousRack?: IStorageRack | null;
  newRack?: IStorageRack | null;
}

const BASE_A4_PRINT_STYLES = `
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    .national-title {
      font-weight: bold;
      font-size: 13pt;
      text-transform: uppercase;
    }
    .national-subtitle {
      font-weight: bold;
      font-size: 13pt;
      border-bottom: 1px solid #000;
      display: inline-block;
      padding-bottom: 3px;
      margin-bottom: 15px;
    }
    .contract-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 15px;
      margin-bottom: 5px;
    }
    .contract-code {
      text-align: center;
      font-style: italic;
      margin-bottom: 20px;
    }
    .section-title {
      font-weight: bold;
      margin-top: 15px;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-size: 13pt;
    }
    .clause-title {
      font-weight: bold;
      margin-top: 10px;
      margin-bottom: 3px;
    }
    p, ul {
      margin: 4px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    table, th, td {
      border: 1px solid #333;
    }
    th, td {
      padding: 6px 10px;
      text-align: left;
    }
    .signatures {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-block {
      width: 45%;
      text-align: center;
    }
    .signature-space {
      height: 90px;
    }
    .draft-badge {
      position: absolute;
      top: 10px;
      right: 15px;
      border: 2px dashed #999;
      padding: 4px 10px;
      font-size: 10pt;
      color: #666;
      text-transform: uppercase;
    }
    .status-badge-active {
      border-color: #2e7d32;
      color: #2e7d32;
    }
    .status-badge-cancelled {
      border-color: #c62828;
      color: #c62828;
    }
`;

export class ContractPdfService {
  private resolveUnitNumber(
    unit?: IStorageUnit | null,
    rawRef?: unknown
  ): string {
    if (unit?.unitNumber) return unit.unitNumber;
    if (
      typeof rawRef === 'object' &&
      rawRef &&
      'unitNumber' in (rawRef as Record<string, unknown>)
    ) {
      return String((rawRef as Record<string, unknown>).unitNumber);
    }
    return rawRef ? String(rawRef) : '';
  }

  private resolveRackLabel(
    rack?: IStorageRack | null,
    rawRef?: unknown
  ): string {
    if (rack?.rackCode) {
      return rack.zone ? `${rack.rackCode} (Khu ${rack.zone})` : rack.rackCode;
    }
    if (
      typeof rawRef === 'object' &&
      rawRef &&
      'rackCode' in (rawRef as Record<string, unknown>)
    ) {
      return String((rawRef as Record<string, unknown>).rackCode);
    }
    return rawRef ? String(rawRef) : 'N/A';
  }

  private formatVND(amount?: number | null): string {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount ?? 0));
  }

  private extractPartyContext(
    context: ContractPdfContext,
    overrideAuthNumber?: string | null
  ) {
    const { contract, facility, customer, profile, legalEntity, signingAuth } =
      context;

    const companyName =
      contract.legalEntitySnapshot?.companyName ??
      legalEntity?.companyName ??
      'CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM';
    const taxCode =
      contract.legalEntitySnapshot?.taxCode ??
      legalEntity?.taxCode ??
      '0109998888';
    const companyAddress =
      contract.legalEntitySnapshot?.registeredAddress ??
      legalEntity?.registeredAddress ??
      'Tòa nhà SSM, Hà Nội, Việt Nam';
    const legalRep =
      contract.legalEntitySnapshot?.legalRepresentative?.name ??
      legalEntity?.legalRepresentative?.name ??
      'Lê Văn Thái';
    const legalRepTitle =
      contract.legalEntitySnapshot?.legalRepresentative?.title ??
      legalEntity?.legalRepresentative?.title ??
      'Tổng Giám Đốc';

    const authNumber =
      overrideAuthNumber ??
      signingAuth?.authorizationNumber ??
      contract.signingAuthorizationSnapshot?.authorizationNumber ??
      null;
    const authorizedSignee = authNumber
      ? `Người được ủy quyền theo QĐ số ${authNumber}`
      : legalRepTitle;

    const unitNumber = this.resolveUnitNumber(
      context.storageUnit,
      contract.storageUnitId
    );

    const customerName =
      contract.customerSnapshot?.name ?? customer?.name ?? 'Khách Hàng';
    const customerEmail =
      contract.customerSnapshot?.email ?? customer?.email ?? '';
    const customerPhone =
      contract.customerSnapshot?.phoneNumber ?? customer?.phoneNumber ?? '';
    const customerAddress =
      contract.customerSnapshot?.address ?? profile?.address ?? 'Việt Nam';
    const customerIdCard =
      contract.customerSnapshot?.idCardNumberMasked ??
      (profile?.idCardLast4 ? `****${profile.idCardLast4}` : 'Đã xác minh');
    const customerDob = contract.customerSnapshot?.dateOfBirth
      ? getVNDateString(new Date(contract.customerSnapshot.dateOfBirth))
      : profile?.dateOfBirth
        ? getVNDateString(new Date(profile.dateOfBirth))
        : 'Theo hồ sơ KYC';

    const facilityName = facility?.name ?? 'Cơ sở Lưu trữ SSM';
    const facilityAddress = facility?.address ?? companyAddress;

    return {
      companyName,
      taxCode,
      companyAddress,
      legalRep,
      legalRepTitle,
      authorizedSignee,
      unitNumber,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      customerIdCard,
      customerDob,
      facilityName,
      facilityAddress,
    };
  }

  /**
   * Generates a formal, print-ready Vietnamese storage rental contract HTML document.
   * Styled according to ISO A4 standard with full legal clauses, metadata, and signature blocks.
   */
  generateContractHtml(context: ContractPdfContext): string {
    const { contract } = context;
    const party = this.extractPartyContext(
      context,
      context.signingAuth?.authorizationNumber ?? null
    );

    const startDateStr = contract.startDate
      ? getVNDateString(new Date(contract.startDate))
      : '';
    const endDateStr = contract.endDate
      ? getVNDateString(new Date(contract.endDate))
      : '';
    const rentalPriceStr = this.formatVND(contract.rentalPrice);
    const depositAmountStr = this.formatVND(contract.depositAmount);
    const recurringAmenitiesTotal = (contract.amenities || [])
      .filter((a) => a.billingUnit !== 'one_time')
      .reduce((sum, a) => sum + (a.totalPrice || 0), 0);
    const effectivePeriodicPrice =
      contract.status === 'active'
        ? (contract.totalPeriodicPrice ?? contract.rentalPrice ?? 0)
        : (contract.rentalPrice ?? 0) + recurringAmenitiesTotal;
    const totalPeriodicStr = this.formatVND(effectivePeriodicPrice);

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hợp Đồng Thuê Kho - ${contract.contractCode}</title>
  <style>${BASE_A4_PRINT_STYLES}  </style>
</head>
<body>
  ${contract.status === 'draft' ? '<div class="draft-badge">Bản In Ký Nháp (DRAFT)</div>' : ''}
  
  <div class="header">
    <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="national-subtitle">Độc lập - Tự do - Hạnh phúc</div>
  </div>

  <div class="contract-title">HỢP ĐỒNG THUÊ KHO LƯU TRỮ TÀI SẢN</div>
  <div class="contract-code">Mã hợp đồng: <strong>${contract.contractCode}</strong></div>

  <p>Hôm nay, ngày ký hợp đồng, các bên gồm có:</p>

  <div class="section-title">BÊN CHO THUÊ (BÊN A):</div>
  <p><strong>Doanh nghiệp:</strong> ${party.companyName}</p>
  <p><strong>Mã số thuế:</strong> ${party.taxCode}</p>
  <p><strong>Địa chỉ trụ sở:</strong> ${party.companyAddress}</p>
  <p><strong>Đại diện pháp luật:</strong> Ông/Bà <strong>${party.legalRep}</strong> — Chức vụ: ${party.legalRepTitle}</p>
  <p><strong>Cơ sở kho cho thuê:</strong> ${party.facilityName} — Địa chỉ: ${party.facilityAddress}</p>
  <p><strong>Người ký hợp đồng:</strong> ${party.authorizedSignee}</p>

  <div class="section-title">BÊN THUÊ (BÊN B):</div>
  <p><strong>Họ và tên:</strong> Ông/Bà <strong>${party.customerName}</strong></p>
  <p><strong>Ngày sinh:</strong> ${party.customerDob}</p>
  <p><strong>Số CCCD / Hộ chiếu:</strong> ${party.customerIdCard}</p>
  <p><strong>Số điện thoại:</strong> ${party.customerPhone}</p>
  <p><strong>Email:</strong> ${party.customerEmail}</p>
  <p><strong>Địa chỉ cư trú:</strong> ${party.customerAddress}</p>

  <div class="section-title">NỘI DUNG HỢP ĐỒNG:</div>
  
  <div class="clause-title">Điều 1: Đối tượng và Thời hạn thuê</div>
  ${
    contract.rentedRackIds && contract.rentedRackIds.length > 0
      ? `<p>- Đối tượng thuê: <strong>Hệ thống Kệ kho (${contract.rentedRackIds.length} kệ)</strong> bố trí tại Khoang chung số <strong>${party.unitNumber}</strong> thuộc cơ sở ${party.facilityName}.</p>`
      : `<p>- Mã phòng kho: <strong>${party.unitNumber}</strong> tại cơ sở ${party.facilityName}.</p>`
  }
  <p>- Thời hạn thuê: Từ ngày <strong>${startDateStr}</strong> đến hết ngày <strong>${endDateStr}</strong>.</p>

  <div class="clause-title">Điều 2: Giá thuê, Tiền đặt cọc và Thanh toán</div>
  <p>- Đơn giá thuê kho: <strong>${rentalPriceStr} VND / tháng</strong>.</p>
  <p>- Tổng tiền thuê kỳ định kỳ: <strong>${totalPeriodicStr} VND</strong>.</p>
  <p>- Tiền đặt cọc bảo đảm: <strong>${depositAmountStr} VND</strong> (đã thanh toán hoặc ký quỹ bảo đảm).</p>

  <div class="clause-title">Điều 3: Cam kết và Quy định ký kết</div>
  <p>1. Bên B cam kết không lưu giữ hàng hóa cấm, chất cháy nổ, vũ khí hoặc hàng hóa trái quy định pháp luật.</p>
  <p>2. Hợp đồng này được hai bên ký sống trên giấy in A4 tại quầy giao dịch cơ sở. Bản scan có chữ ký sống đầy đủ của hai bên được hệ thống số hóa, băm SHA-256 lưu vết tính toàn vẹn và có giá trị ràng buộc thực hiện cao nhất.</p>

  <div class="signatures">
    <div class="signature-block">
      <p><strong>ĐẠI DIỆN BÊN B (BÊN THUÊ)</strong></p>
      <p><em>(Ký, ghi rõ họ tên)</em></p>
      <div class="signature-space"></div>
      <p><strong>${party.customerName}</strong></p>
    </div>
    <div class="signature-block">
      <p><strong>ĐẠI DIỆN BÊN A (BÊN CHO THUÊ)</strong></p>
      <p><em>(Ký tên, đóng dấu cơ sở)</em></p>
      <div class="signature-space"></div>
      <p><strong>${party.authorizedSignee}</strong></p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a Buffer containing the complete HTML printable document.
   */
  generateContractPdfBuffer(context: ContractPdfContext): Buffer {
    const html = this.generateContractHtml(context);
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Generates a formal, print-ready Vietnamese contract addendum HTML document (ISO A4).
   * Supports RENEW, UNIT_CHANGE, and RACK_CHANGE addendum types.
   */
  generateAddendumHtml(context: ContractAddendumPdfContext): string {
    const { contract, addendum } = context;
    const party = this.extractPartyContext(
      context,
      addendum.signingAuthorizationSnapshot?.authorizationNumber ??
        context.signingAuth?.authorizationNumber ??
        contract.signingAuthorizationSnapshot?.authorizationNumber ??
        null
    );

    const statusBadge =
      addendum.status === ContractAddendumStatusEnum.ACTIVE
        ? '<div class="draft-badge status-badge-active">ĐÃ CÓ HIỆU LỰC (ACTIVE)</div>'
        : addendum.status === ContractAddendumStatusEnum.CANCELLED ||
            addendum.status === ContractAddendumStatusEnum.REJECTED
          ? `<div class="draft-badge status-badge-cancelled">ĐÃ HỦY / TỪ CHỐI (${addendum.status.toUpperCase()})</div>`
          : addendum.status === ContractAddendumStatusEnum.PENDING_APPROVAL
            ? '<div class="draft-badge">CHỜ DUYỆT (PENDING_APPROVAL)</div>'
            : '<div class="draft-badge">Bản In Ký Nháp (DRAFT)</div>';

    const typeTitleMap: Record<ContractAddendumTypeEnum, string> = {
      [ContractAddendumTypeEnum.RENEW]: 'Gia hạn thời hạn thuê',
      [ContractAddendumTypeEnum.UNIT_CHANGE]: 'Thay đổi phòng kho',
      [ContractAddendumTypeEnum.RACK_CHANGE]: 'Chuyển đổi kệ lưu trữ',
    };
    const addendumTypeLabel =
      typeTitleMap[addendum.type] ?? String(addendum.type);

    const requestedAtStr = addendum.requestedAt
      ? getVNDateString(new Date(addendum.requestedAt))
      : getVNDateString(new Date());
    const newPeriodicPriceStr = this.formatVND(addendum.totalPeriodicPrice);

    let adjustmentDetailsHtml: string;
    if (addendum.type === ContractAddendumTypeEnum.RENEW) {
      const prevEndStr = addendum.previousEndDate
        ? getVNDateString(new Date(addendum.previousEndDate))
        : getVNDateString(new Date(contract.endDate));
      const newEndStr = addendum.newEndDate
        ? getVNDateString(new Date(addendum.newEndDate))
        : '';
      adjustmentDetailsHtml = `
  <p>- Đối tượng áp dụng: Kho <strong>${party.unitNumber}</strong> tại cơ sở ${party.facilityName}.</p>
  <p>- Ngày kết thúc hợp đồng hiện tại: <strong>${prevEndStr}</strong>.</p>
  <p>- Ngày kết thúc mới sau gia hạn: <strong>${newEndStr}</strong>.</p>
  <p>- Tổng tiền thuê kỳ định kỳ áp dụng: <strong>${newPeriodicPriceStr} VND</strong>.</p>`;
    } else if (addendum.type === ContractAddendumTypeEnum.UNIT_CHANGE) {
      const prevUnitLabel = this.resolveUnitNumber(
        context.previousStorageUnit,
        addendum.previousStorageUnitId ?? contract.storageUnitId
      );
      const newUnitLabel = this.resolveUnitNumber(
        context.newStorageUnit,
        addendum.newStorageUnitId
      );
      adjustmentDetailsHtml = `
  <p>- Phòng kho hiện tại (cũ): <strong>${prevUnitLabel}</strong>.</p>
  <p>- Phòng kho chuyển đổi (mới): <strong>${newUnitLabel}</strong> tại cơ sở ${party.facilityName}.</p>
  <p>- Tổng tiền thuê kỳ định kỳ mới: <strong>${newPeriodicPriceStr} VND</strong>.</p>`;
    } else {
      const prevRackLabel = this.resolveRackLabel(
        context.previousRack,
        addendum.previousRackId
      );
      const newRackLabel = this.resolveRackLabel(
        context.newRack,
        addendum.newRackId
      );
      adjustmentDetailsHtml = `
  <p>- Khoang kho áp dụng: <strong>${party.unitNumber}</strong> tại cơ sở ${party.facilityName}.</p>
  <p>- Kệ lưu trữ hiện tại (cũ): <strong>${prevRackLabel}</strong>.</p>
  <p>- Kệ lưu trữ chuyển đổi (mới): <strong>${newRackLabel}</strong>.</p>
  <p>- Tổng tiền thuê kỳ định kỳ áp dụng: <strong>${newPeriodicPriceStr} VND</strong>.</p>`;
    }

    const amenitiesHtml =
      addendum.amenities && addendum.amenities.length > 0
        ? `
  <div class="clause-title">Điều 2: Tiện ích đi kèm theo phụ lục</div>
  <table>
    <thead>
      <tr>
        <th style="width: 8%;">STT</th>
        <th style="width: 44%;">Tên tiện ích</th>
        <th style="width: 14%;">Số lượng</th>
        <th style="width: 17%;">Đơn giá (VND)</th>
        <th style="width: 17%;">Thành tiền (VND)</th>
      </tr>
    </thead>
    <tbody>
      ${addendum.amenities
        .map(
          (am, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${am.name}</td>
        <td>${am.quantity}</td>
        <td>${this.formatVND(am.pricePerUnit)}</td>
        <td>${this.formatVND(am.totalPrice)}</td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>`
        : '';

    const nextClauseIndex = addendum.amenities?.length ? 3 : 2;
    const notesHtml = addendum.notes
      ? `<p>- Ghi chú bổ sung: ${addendum.notes}</p>`
      : '';

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Phụ Lục Hợp Đồng - ${addendum.addendumCode}</title>
  <style>${BASE_A4_PRINT_STYLES}  </style>
</head>
<body>
  ${statusBadge}

  <div class="header">
    <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="national-subtitle">Độc lập - Tự do - Hạnh phúc</div>
  </div>

  <div class="contract-title">PHỤ LỤC HỢP ĐỒNG THUÊ KHO LƯU TRỮ TÀI SẢN</div>
  <div class="contract-code">
    Mã phụ lục: <strong>${addendum.addendumCode}</strong> — Đính kèm Hợp đồng số: <strong>${contract.contractCode}</strong><br/>
    Loại điều chỉnh: <strong>${addendumTypeLabel}</strong> — Ngày lập: ${requestedAtStr}
  </div>

  <p>Căn cứ Hợp đồng thuê kho số <strong>${contract.contractCode}</strong> đã ký giữa các bên:</p>

  <div class="section-title">BÊN CHO THUÊ (BÊN A):</div>
  <p><strong>Doanh nghiệp:</strong> ${party.companyName}</p>
  <p><strong>Mã số thuế:</strong> ${party.taxCode}</p>
  <p><strong>Địa chỉ trụ sở:</strong> ${party.companyAddress}</p>
  <p><strong>Đại diện pháp luật:</strong> Ông/Bà <strong>${party.legalRep}</strong> — Chức vụ: ${party.legalRepTitle}</p>
  <p><strong>Cơ sở kho áp dụng:</strong> ${party.facilityName} — Địa chỉ: ${party.facilityAddress}</p>
  <p><strong>Người ký phụ lục:</strong> ${party.authorizedSignee}</p>

  <div class="section-title">BÊN THUÊ (BÊN B):</div>
  <p><strong>Họ và tên:</strong> Ông/Bà <strong>${party.customerName}</strong></p>
  <p><strong>Ngày sinh:</strong> ${party.customerDob}</p>
  <p><strong>Số CCCD / Hộ chiếu:</strong> ${party.customerIdCard}</p>
  <p><strong>Số điện thoại:</strong> ${party.customerPhone}</p>
  <p><strong>Email:</strong> ${party.customerEmail}</p>
  <p><strong>Địa chỉ cư trú:</strong> ${party.customerAddress}</p>

  <div class="section-title">NỘI DUNG ĐIỀU CHỈNH:</div>
  <div class="clause-title">Điều 1: Chi tiết nội dung phụ lục (${addendumTypeLabel})</div>
  ${adjustmentDetailsHtml}
  ${notesHtml}
  ${amenitiesHtml}

  <div class="clause-title">Điều ${nextClauseIndex}: Hiệu lực và Quy định ký kết</div>
  <p>1. Phụ lục này là một bộ phận không thể tách rời của Hợp đồng thuê kho số <strong>${contract.contractCode}</strong>. Các điều khoản khác của Hợp đồng gốc không bị thay đổi bởi Phụ lục này vẫn giữ nguyên hiệu lực thi hành.</p>
  <p>2. Phụ lục được hai bên ký sống trên bản in A4 tại cơ sở; bản scan có chữ ký đầy đủ được hệ thống lưu trữ và băm SHA-256 đảm bảo tính toàn vẹn pháp lý.</p>

  <div class="signatures">
    <div class="signature-block">
      <p><strong>ĐẠI DIỆN BÊN B (BÊN THUÊ)</strong></p>
      <p><em>(Ký, ghi rõ họ tên)</em></p>
      <div class="signature-space"></div>
      <p><strong>${party.customerName}</strong></p>
    </div>
    <div class="signature-block">
      <p><strong>ĐẠI DIỆN BÊN A (BÊN CHO THUÊ)</strong></p>
      <p><em>(Ký tên, đóng dấu cơ sở)</em></p>
      <div class="signature-space"></div>
      <p><strong>${party.authorizedSignee}</strong></p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a Buffer containing the complete HTML printable addendum document.
   */
  generateAddendumPdfBuffer(context: ContractAddendumPdfContext): Buffer {
    const html = this.generateAddendumHtml(context);
    return Buffer.from(html, 'utf-8');
  }
}
