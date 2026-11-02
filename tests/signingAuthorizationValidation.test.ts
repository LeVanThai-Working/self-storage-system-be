import { describe, it, expect } from 'vitest';
import { createSigningAuthorizationSchema } from '../src/modules/signingAuthorization/schemas/signingAuthorization.request.schema.ts';

describe('SigningAuthorization Request Validation Schema', () => {
  const validPayload = {
    legalEntityId: '660000000000000000000099',
    authorizedUserId: '661100000000000000000005',
    facilityIds: ['660000000000000000000005'],
    authorizationNumber: '01/2026/UQKHD',
    issuedDate: '2026-11-02T00:00:00.000Z',
    validFrom: '2026-11-02T00:00:00.000Z',
    validTo: '2028-11-03T23:59:59.000Z',
    documentUrl: 'https://res.cloudinary.com/test/image.jpg',
    notes: null,
  };

  it('should accept ISO date strings and handle notes: null properly', () => {
    const parsed = createSigningAuthorizationSchema.parse(validPayload);
    expect(parsed.authorizationNumber).toBe('01/2026/UQKHD');
    // Ensure date fields remain strings so TSOA runtime validator receives typeof === "string"
    expect(typeof parsed.issuedDate).toBe('string');
    expect(typeof parsed.validFrom).toBe('string');
    expect(typeof parsed.validTo).toBe('string');
    // Ensure notes: null is transformed to undefined so TSOA optional field check passes
    expect(parsed.notes).toBeUndefined();
  });

  it('should fail when validTo is earlier than validFrom', () => {
    const invalidPayload = {
      ...validPayload,
      validFrom: '2028-11-03T23:59:59.000Z',
      validTo: '2026-11-02T00:00:00.000Z',
    };

    expect(() =>
      createSigningAuthorizationSchema.parse(invalidPayload)
    ).toThrow();
  });
});
