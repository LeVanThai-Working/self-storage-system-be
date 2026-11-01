import type { IInvoice } from '../invoice.model.ts';
import type { IContract } from '../../contract/contract.model.ts';
import type { IFacility } from '../../facility/facility.model.ts';
import type { IUser } from '../../user/user.model.ts';
import type { IProfile } from '../../profile/profile.model.ts';
import type { ILegalEntity } from '../../legalEntity/legalEntity.model.ts';
import type { IPayment } from '../../payment/payment.model.ts';
import {
  InvoiceStatusEnum,
  InvoiceTypeEnum,
  InvoiceItemTypeEnum,
} from '../../../common/enums/billing.enum.ts';
import { getVNDateString } from '../../../utils/date.util.ts';
import { getSepayConfig } from '../../../config/sepay.config.ts';

export interface InvoicePdfContext {
  invoice: IInvoice;
  contract?: IContract | null;
  facility?: IFacility | null;
  customer?: IUser | null;
  profile?: IProfile | null;
  legalEntity?: ILegalEntity | null;
  payment?: IPayment | null;
}

export class InvoicePdfService {
  /**
   * Generates a formal, ISO A4 print-ready HTML invoice/receipt document.
   * Embeds legal entity credentials, customer metadata, itemized breakdown,
   * payment status badges, and dynamic VietQR code for instant settlement.
   */
  generateInvoiceHtml(context: InvoicePdfContext): string {
    const {
      invoice,
      contract,
      facility,
      customer,
      profile,
      legalEntity,
      payment,
    } = context;

    const companyName =
      contract?.legalEntitySnapshot?.companyName ??
      legalEntity?.companyName ??
      'CÔNG TY TNHH HỆ THỐNG LƯU TRỮ THÔNG MINH SSM';
    const taxCode =
      contract?.legalEntitySnapshot?.taxCode ??
      legalEntity?.taxCode ??
      '0109998888';
    const companyAddress =
      contract?.legalEntitySnapshot?.registeredAddress ??
      legalEntity?.registeredAddress ??
      'Tòa nhà SSM, Hà Nội, Việt Nam';
    const legalRep =
      contract?.legalEntitySnapshot?.legalRepresentative?.name ??
      legalEntity?.legalRepresentative?.name ??
      'Lê Văn Thái';
    const legalRepTitle =
      contract?.legalEntitySnapshot?.legalRepresentative?.title ??
      legalEntity?.legalRepresentative?.title ??
      'Tổng Giám Đốc';

    const facilityName = facility?.name ?? 'Cơ sở Lưu trữ SSM';
    const facilityAddress = facility?.address ?? companyAddress;

    const customerName = customer?.name ?? 'Khách Hàng';
    const customerEmail = customer?.email ?? '';
    const customerPhone = customer?.phoneNumber ?? '';
    const customerAddress = profile?.address ?? 'Việt Nam';

    const formatVND = (amount: number) =>
      new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0));

    const invoiceTitle =
      invoice.type === InvoiceTypeEnum.CHECK_OUT_SETTLEMENT
        ? 'PHIẾU QUYẾT TOÁN VÀ THANH LÝ TRẢ KHO'
        : invoice.type === InvoiceTypeEnum.INCIDENTAL
          ? 'HÓA ĐƠN ĐIỀU CHỈNH / PHỤ PHÍ PHÁT SINH'
          : 'HÓA ĐƠN DỊCH VỤ LƯU TRỮ VÀ TIỆN ÍCH';

    const typeDescription =
      invoice.type === InvoiceTypeEnum.FIRST_PERIOD
        ? 'Thu tiền thuê kỳ đầu tiên'
        : invoice.type === InvoiceTypeEnum.RECURRING
          ? `Thu tiền thuê định kỳ (Kỳ ${invoice.billingPeriodIndex})`
          : invoice.type === InvoiceTypeEnum.CHECK_OUT_SETTLEMENT
            ? 'Quyết toán công nợ và hoàn cọc khi trả kho'
            : 'Phụ phí phát sinh / điều chỉnh hợp đồng';

    const periodStr =
      invoice.periodStartDate && invoice.periodEndDate
        ? `${getVNDateString(new Date(invoice.periodStartDate))} đến ${getVNDateString(new Date(invoice.periodEndDate))}`
        : 'Theo thỏa thuận hợp đồng';

    const dueDateStr = invoice.dueDate
      ? getVNDateString(new Date(invoice.dueDate))
      : '';
    const issuedAtStr = invoice.issuedAt
      ? getVNDateString(new Date(invoice.issuedAt))
      : getVNDateString(new Date());

    const isPaid = invoice.status === InvoiceStatusEnum.PAID;
    const isCancelled =
      invoice.status === InvoiceStatusEnum.CANCELLED ||
      invoice.status === InvoiceStatusEnum.VOID;
    const isOverdue = invoice.status === InvoiceStatusEnum.OVERDUE;

    const balanceDue = Math.max(
      0,
      (invoice.totalAmount || 0) - (invoice.paidAmount || 0)
    );

    // Dynamic VietQR Generation
    const sepayConfig = getSepayConfig();
    const qrDes = payment?.paymentCode || invoice.invoiceCode;
    const qrAmount = balanceDue > 0 ? balanceDue : invoice.totalAmount;
    const qrUrl = `https://qr.sepay.vn/img?acc=${encodeURIComponent(
      sepayConfig.accountNumber
    )}&bank=${encodeURIComponent(
      sepayConfig.bankCode
    )}&amount=${Math.round(qrAmount)}&des=${encodeURIComponent(qrDes)}`;

    const renderItemType = (type?: InvoiceItemTypeEnum) => {
      switch (type) {
        case InvoiceItemTypeEnum.RENT:
          return 'Tiền kho';
        case InvoiceItemTypeEnum.AMENITY:
          return 'Tiện ích';
        case InvoiceItemTypeEnum.DAMAGE_FEE:
          return 'Bồi thường hư hại';
        case InvoiceItemTypeEnum.OVERDUE_FEE:
          return 'Phí quá hạn';
        case InvoiceItemTypeEnum.DISCOUNT:
          return 'Giảm giá / Cấn trừ';
        default:
          return 'Khoản mục';
      }
    };

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Hóa Đơn - ${invoice.invoiceCode}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 15mm 15mm;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12.5pt;
      line-height: 1.35;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .header {
      text-align: center;
      margin-bottom: 12px;
    }
    .national-title {
      font-weight: bold;
      font-size: 12pt;
      text-transform: uppercase;
    }
    .national-subtitle {
      font-weight: bold;
      font-size: 11pt;
      border-bottom: 1px solid #000;
      display: inline-block;
      padding-bottom: 2px;
      margin-bottom: 12px;
    }
    .invoice-title {
      text-align: center;
      font-size: 16pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 10px;
      margin-bottom: 4px;
      color: #0d47a1;
    }
    .invoice-meta {
      text-align: center;
      font-style: italic;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .two-cols {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }
    .col-half {
      width: 48%;
    }
    .box {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 10px;
      background-color: #fafafa;
    }
    .box-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
      margin-bottom: 6px;
      color: #1a237e;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 4px;
    }
    p {
      margin: 3px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      margin-bottom: 12px;
    }
    table, th, td {
      border: 1px solid #444;
    }
    th {
      background-color: #f0f4f8;
      padding: 6px 8px;
      text-align: center;
      font-size: 11pt;
    }
    td {
      padding: 6px 8px;
      font-size: 11pt;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }
    .totals-table {
      width: 50%;
      margin-left: auto;
      border-collapse: collapse;
      margin-top: 8px;
    }
    .totals-table td {
      padding: 4px 8px;
      border: none;
    }
    .totals-table tr.total-row td {
      font-weight: bold;
      font-size: 13pt;
      border-top: 2px solid #333;
      color: #b71c1c;
    }
    .payment-section {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border: 1px dashed #0d47a1;
      border-radius: 4px;
      background-color: #f5f9ff;
    }
    .qr-block {
      text-align: center;
      width: 40%;
    }
    .qr-block img {
      width: 140px;
      height: 140px;
      border: 1px solid #ccc;
      border-radius: 4px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      font-weight: bold;
      font-size: 13pt;
      text-transform: uppercase;
      border-radius: 4px;
    }
    .badge-paid {
      border: 2px solid #2e7d32;
      color: #2e7d32;
      background-color: #e8f5e9;
    }
    .badge-issued {
      border: 2px solid #0277bd;
      color: #0277bd;
      background-color: #e1f5fe;
    }
    .badge-overdue {
      border: 2px solid #c62828;
      color: #c62828;
      background-color: #ffebee;
    }
    .badge-cancelled {
      border: 2px solid #757575;
      color: #757575;
      background-color: #eeeeee;
    }
    .signatures {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .signature-block {
      width: 45%;
      text-align: center;
    }
    .signature-space {
      height: 70px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="national-title">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="national-subtitle">Độc lập - Tự do - Hạnh phúc</div>
  </div>

  <div class="invoice-title">${invoiceTitle}</div>
  <div class="invoice-meta">
    Mã hóa đơn: <strong>${invoice.invoiceCode}</strong> | Ngày lập: ${issuedAtStr} | Phân loại: ${typeDescription}
  </div>

  <div class="two-cols">
    <div class="col-half box">
      <div class="box-title">ĐƠN VỊ CUNG CẤP DỊCH VỤ (BÊN A)</div>
      <p><strong>Doanh nghiệp:</strong> ${companyName}</p>
      <p><strong>Mã số thuế:</strong> ${taxCode}</p>
      <p><strong>Địa chỉ trụ sở:</strong> ${companyAddress}</p>
      <p><strong>Đại diện:</strong> Ông/Bà ${legalRep} (${legalRepTitle})</p>
      <p><strong>Cơ sở thực hiện:</strong> ${facilityName}</p>
      <p><strong>Địa chỉ kho:</strong> ${facilityAddress}</p>
    </div>

    <div class="col-half box">
      <div class="box-title">KHÁCH HÀNG / BÊN THUÊ (BÊN B)</div>
      <p><strong>Họ và tên:</strong> ${customerName}</p>
      <p><strong>Số điện thoại:</strong> ${customerPhone || 'Chưa cập nhật'}</p>
      <p><strong>Email:</strong> ${customerEmail || 'Chưa cập nhật'}</p>
      <p><strong>Địa chỉ:</strong> ${customerAddress}</p>
      <p><strong>Mã hợp đồng:</strong> ${contract?.contractCode || 'N/A'}</p>
      <p><strong>Kỳ sử dụng:</strong> ${periodStr}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">STT</th>
        <th style="width: 45%;">Tên Khoản Mục / Dịch Vụ</th>
        <th style="width: 15%;">Phân Loại</th>
        <th style="width: 10%;">Số Lượng</th>
        <th style="width: 12%;">Đơn Giá (VND)</th>
        <th style="width: 13%;">Thành Tiền (VND)</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items
        .map(
          (item, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <strong>${item.name}</strong>
          ${item.description ? `<br/><small style="color: #666;">${item.description}</small>` : ''}
        </td>
        <td class="text-center">${renderItemType(item.itemType)}</td>
        <td class="text-center">${item.quantity}</td>
        <td class="text-right">${formatVND(item.unitPrice)}</td>
        <td class="text-right"><strong>${formatVND(item.amount)}</strong></td>
      </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <table class="totals-table">
    <tr>
      <td class="text-right">Cộng tiền dịch vụ:</td>
      <td class="text-right" style="width: 40%;"><strong>${formatVND(invoice.subtotal)} VND</strong></td>
    </tr>
    ${
      invoice.discountAmount > 0
        ? `<tr>
      <td class="text-right">Giảm giá / Chiết khấu:</td>
      <td class="text-right" style="color: #2e7d32;"><strong>-${formatVND(invoice.discountAmount)} VND</strong></td>
    </tr>`
        : ''
    }
    ${
      invoice.taxAmount > 0
        ? `<tr>
      <td class="text-right">Thuế GTGT (VAT):</td>
      <td class="text-right"><strong>+${formatVND(invoice.taxAmount)} VND</strong></td>
    </tr>`
        : ''
    }
    <tr class="total-row">
      <td class="text-right">TỔNG THANH TOÁN:</td>
      <td class="text-right">${formatVND(invoice.totalAmount)} VND</td>
    </tr>
    <tr>
      <td class="text-right">Đã thanh toán:</td>
      <td class="text-right" style="color: #2e7d32;"><strong>${formatVND(invoice.paidAmount)} VND</strong></td>
    </tr>
    ${
      balanceDue > 0
        ? `<tr>
      <td class="text-right"><strong>CÒN PHẢI NỘP:</strong></td>
      <td class="text-right" style="color: #c62828;"><strong>${formatVND(balanceDue)} VND</strong></td>
    </tr>`
        : ''
    }
  </table>

  <div class="payment-section">
    <div style="width: 55%;">
      <p><strong>Tình trạng thanh toán:</strong></p>
      ${
        isPaid
          ? `<div class="badge badge-paid">✔ ĐÃ THANH TOÁN (${formatVND(invoice.paidAmount)} VND)</div>
             <p style="margin-top: 6px; font-size: 11pt; color: #2e7d32;">
               Thời gian: ${getVNDateString(new Date(invoice.paidAt || new Date()))}<br/>
               Phương thức: ${invoice.paymentMethod || 'Chuyển khoản SePay VietQR'}
             </p>`
          : isCancelled
            ? `<div class="badge badge-cancelled">✖ ĐÃ HỦY / VOID</div>`
            : isOverdue
              ? `<div class="badge badge-overdue">⚠ QUÁ HẠN THANH TOÁN (Hạn: ${dueDateStr})</div>
                 <p style="color: #c62828; font-size: 10.5pt; margin-top: 4px;">
                   Vui lòng thanh toán ngay để tránh phát sinh phí trễ hạn hoặc niêm phong kho.
                 </p>`
              : `<div class="badge badge-issued">CHƯA THANH TOÁN (Hạn: ${dueDateStr})</div>`
      }
      <p style="margin-top: 8px; font-size: 10pt; color: #555;">
        * Quý khách có thể chuyển khoản trực tiếp qua ngân hàng hoặc thanh toán tiền mặt tại quầy giao dịch cơ sở.
      </p>
    </div>

    ${
      !isPaid && !isCancelled
        ? `<div class="qr-block">
        <p style="font-weight: bold; font-size: 10.5pt; margin-bottom: 4px;">Quét mã VietQR để thanh toán</p>
        <img src="${qrUrl}" alt="VietQR Payment" />
        <p style="font-size: 9.5pt; color: #555; margin-top: 2px;">Ngân hàng: ${sepayConfig.bankCode} | STK: ${sepayConfig.accountNumber}</p>
        <p style="font-size: 9.5pt; font-weight: bold; color: #0d47a1;">Nội dung: ${qrDes}</p>
      </div>`
        : ''
    }
  </div>

  <div class="signatures">
    <div class="signature-block">
      <p><strong>KHÁCH HÀNG / NGƯỜI NỘP TIỀN</strong></p>
      <p><em>(Ký, ghi rõ họ tên)</em></p>
      <div class="signature-space"></div>
      <p><strong>${customerName}</strong></p>
    </div>
    <div class="signature-block">
      <p><strong>NGƯỜI LẬP PHIẾU / ĐẠI DIỆN CƠ SỞ</strong></p>
      <p><em>(Ký, đóng dấu cơ sở)</em></p>
      <div class="signature-space"></div>
      <p><strong>${facilityName}</strong></p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Generates a Buffer containing the complete HTML printable document.
   */
  generateInvoicePdfBuffer(context: InvoicePdfContext): Buffer {
    const html = this.generateInvoiceHtml(context);
    return Buffer.from(html, 'utf-8');
  }
}
