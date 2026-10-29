import type { IContract } from '../contract.model.ts';
import type { IFacility } from '../../facility/facility.model.ts';
import type { IUser } from '../../user/user.model.ts';
import type { IProfile } from '../../profile/profile.model.ts';
import type { ILegalEntity } from '../../legalEntity/legalEntity.model.ts';
import type { ISigningAuthorization } from '../../signingAuthorization/signingAuthorization.model.ts';
import type { IStorageUnit } from '../../storageUnit/storageUnit.model.ts';
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

export class ContractPdfService {
  /**
   * Generates a formal, print-ready Vietnamese storage rental contract HTML document.
   * Styled according to ISO A4 standard with full legal clauses, metadata, and signature blocks.
   */
  generateContractHtml(context: ContractPdfContext): string {
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

    const authorizedSignee = signingAuth
      ? `Người được ủy quyền theo QĐ số ${signingAuth.authorizationNumber}`
      : legalRepTitle;

    const unitNumber =
      context.storageUnit?.unitNumber ??
      (typeof contract.storageUnitId === 'object' &&
      contract.storageUnitId &&
      'unitNumber' in
        (contract.storageUnitId as unknown as Record<string, unknown>)
        ? String(
            (contract.storageUnitId as unknown as Record<string, unknown>)
              .unitNumber
          )
        : String(contract.storageUnitId || ''));

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

    const startDateStr = contract.startDate
      ? getVNDateString(new Date(contract.startDate))
      : '';
    const endDateStr = contract.endDate
      ? getVNDateString(new Date(contract.endDate))
      : '';
    const rentalPriceStr = new Intl.NumberFormat('vi-VN').format(
      contract.rentalPrice ?? 0
    );
    const depositAmountStr = new Intl.NumberFormat('vi-VN').format(
      contract.depositAmount ?? 0
    );
    const totalPeriodicStr = new Intl.NumberFormat('vi-VN').format(
      contract.totalPeriodicPrice ?? contract.rentalPrice ?? 0
    );

    const facilityName = facility?.name ?? 'Cơ sở Lưu trữ SSM';
    const facilityAddress = facility?.address ?? companyAddress;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hợp Đồng Thuê Kho - ${contract.contractCode}</title>
  <style>
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
  </style>
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
  <p><strong>Doanh nghiệp:</strong> ${companyName}</p>
  <p><strong>Mã số thuế:</strong> ${taxCode}</p>
  <p><strong>Địa chỉ trụ sở:</strong> ${companyAddress}</p>
  <p><strong>Đại diện pháp luật:</strong> Ông/Bà <strong>${legalRep}</strong> — Chức vụ: ${legalRepTitle}</p>
  <p><strong>Cơ sở kho cho thuê:</strong> ${facilityName} — Địa chỉ: ${facilityAddress}</p>
  <p><strong>Người ký hợp đồng:</strong> ${authorizedSignee}</p>

  <div class="section-title">BÊN THUÊ (BÊN B):</div>
  <p><strong>Họ và tên:</strong> Ông/Bà <strong>${customerName}</strong></p>
  <p><strong>Ngày sinh:</strong> ${customerDob}</p>
  <p><strong>Số CCCD / Hộ chiếu:</strong> ${customerIdCard}</p>
  <p><strong>Số điện thoại:</strong> ${customerPhone}</p>
  <p><strong>Email:</strong> ${customerEmail}</p>
  <p><strong>Địa chỉ cư trú:</strong> ${customerAddress}</p>

  <div class="section-title">NỘI DUNG HỢP ĐỒNG:</div>
  
  <div class="clause-title">Điều 1: Đối tượng và Thời hạn thuê</div>
  ${
    contract.rentedRackIds && contract.rentedRackIds.length > 0
      ? `<p>- Đối tượng thuê: <strong>Hệ thống Kệ kho (${contract.rentedRackIds.length} kệ)</strong> bố trí tại Khoang chung số <strong>${unitNumber}</strong> thuộc cơ sở ${facilityName}.</p>`
      : `<p>- Mã phòng kho: <strong>${unitNumber}</strong> tại cơ sở ${facilityName}.</p>`
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
      <p><strong>${customerName}</strong></p>
    </div>
    <div class="signature-block">
      <p><strong>ĐẠI DIỆN BÊN A (BÊN CHO THUÊ)</strong></p>
      <p><em>(Ký tên, đóng dấu cơ sở)</em></p>
      <div class="signature-space"></div>
      <p><strong>${authorizedSignee}</strong></p>
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
}
