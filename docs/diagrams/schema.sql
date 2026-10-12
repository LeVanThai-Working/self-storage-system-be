-- ==========================================================
-- SELF STORAGE SYSTEM - DATABASE LOGICAL SCHEMA (SQL DDL)
-- Dùng để import trực tiếp vào Draw.io:
-- Menu: Arrange (Sắp xếp) -> Insert (Chèn) -> Advanced (Nâng cao) -> SQL...
-- ==========================================================

-- ----------------------------------------------------------
-- 1. CỤM IDENTITY & AUTHENTICATION (XANH DƯƠNG / BLUE)
-- ----------------------------------------------------------

CREATE TABLE "User" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255),
    "phoneNumber" VARCHAR(11),
    "googleId" VARCHAR(255) UNIQUE,
    "roleId" VARCHAR(24),
    "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
    "authProvider" VARCHAR(20) NOT NULL DEFAULT 'local',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "assignedFacilityId" VARCHAR(24),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("assignedFacilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("roleId") REFERENCES "Role"("_id")
);

CREATE TABLE "Profile" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "userId" VARCHAR(24) NOT NULL UNIQUE,
    "avatarUrl" TEXT,
    "dateOfBirth" DATE,
    "address" VARCHAR(200),
    "gender" VARCHAR(20),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "User"("_id")
);

CREATE TABLE "Otp" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "email" VARCHAR(255) NOT NULL,
    "otp" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("email") REFERENCES "User"("email")
);

-- ----------------------------------------------------------
-- 1.1 CỤM PHÂN QUYỀN RBAC (THAM KHẢO / REFERENCE ONLY - CYAN)
-- ----------------------------------------------------------

CREATE TABLE "Role" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "code" VARCHAR(50) NOT NULL UNIQUE,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isSystem" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "Permission" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "code" VARCHAR(100) NOT NULL UNIQUE,
    "name" VARCHAR(100) NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "RolePermission" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "roleId" VARCHAR(24) NOT NULL,
    "permissionId" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("roleId") REFERENCES "Role"("_id"),
    FOREIGN KEY ("permissionId") REFERENCES "Permission"("_id")
);

-- ----------------------------------------------------------
-- 2. CỤM MASTER CATALOG & FACILITIES (XANH LÁ / GREEN)
-- ----------------------------------------------------------

CREATE TABLE "Facility" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(11),
    "email" VARCHAR(255),
    "description" VARCHAR(1000),
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "managerId" VARCHAR(24),
    "operatingHours_open" VARCHAR(10),
    "operatingHours_close" VARCHAR(10),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("managerId") REFERENCES "User"("_id")
);

CREATE TABLE "UnitType" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "description" VARCHAR(1000),
    "length" DECIMAL(8,2) NOT NULL,
    "width" DECIMAL(8,2) NOT NULL,
    "height" DECIMAL(8,2) NOT NULL,
    "area" DECIMAL(8,2) NOT NULL,
    "volume" DECIMAL(8,2) NOT NULL,
    "category" VARCHAR(50) DEFAULT 'medium',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "images" TEXT,
    "features" TEXT,
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
);

CREATE TABLE "Amenity" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL UNIQUE,
    "description" VARCHAR(1000),
    "type" VARCHAR(50) NOT NULL DEFAULT 'physical',
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "images" TEXT,
    "tags" TEXT,
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
);

-- ----------------------------------------------------------
-- 3. CỤM OFFERINGS & PHYSICAL STORAGE UNITS (XANH LÁ ĐẬM)
-- ----------------------------------------------------------

CREATE TABLE "FacilityUnitTypeOffering" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "facilityId" VARCHAR(24) NOT NULL,
    "unitTypeId" VARCHAR(24) NOT NULL,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "depositMultiplier" DECIMAL(4,2) DEFAULT 1,
    "minRentalDays" INT DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "notes" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("_id")
);

CREATE TABLE "FacilityAmenityOffering" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "facilityId" VARCHAR(24) NOT NULL,
    "amenityId" VARCHAR(24) NOT NULL,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "totalQuantity" INT DEFAULT 0,
    "inUseQuantity" INT DEFAULT 0,
    "status" VARCHAR(50) NOT NULL DEFAULT 'active',
    "notes" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("amenityId") REFERENCES "Amenity"("_id")
);

CREATE TABLE "StorageUnit" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "facilityId" VARCHAR(24) NOT NULL,
    "unitTypeId" VARCHAR(24) NOT NULL,
    "unitNumber" VARCHAR(50) NOT NULL,
    "floor" INT NOT NULL DEFAULT 1,
    "zone" VARCHAR(50),
    "status" VARCHAR(50) NOT NULL DEFAULT 'available',
    "notes" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("_id")
);

-- ----------------------------------------------------------
-- 4. CỤM BOOKING & CONTRACT LIFECYCLE (CAM / ORANGE)
-- ----------------------------------------------------------

CREATE TABLE "Reservation" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "reservationCode" VARCHAR(50) NOT NULL UNIQUE,
    "customerId" VARCHAR(24) NOT NULL,
    "facilityId" VARCHAR(24) NOT NULL,
    "facilityUnitTypeOfferingId" VARCHAR(24) NOT NULL,
    "storageUnitId" VARCHAR(24),
    "startDate" TIMESTAMP NOT NULL,
    "rentalDuration" INT NOT NULL,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "basePrice" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP,
    "receivedBy" VARCHAR(24),
    "receivedAt" TIMESTAMP,
    "assignedBy" VARCHAR(24),
    "assignedAt" TIMESTAMP,
    "confirmedBy" VARCHAR(24),
    "confirmedAt" TIMESTAMP,
    "rejectionReason" VARCHAR(500),
    "cancellationReason" VARCHAR(500),
    "cancelledBy" VARCHAR(24),
    "cancelledAt" TIMESTAMP,
    "refundAmount" DECIMAL(12,2) DEFAULT 0,
    "paidAt" TIMESTAMP,
    "paidAmount" DECIMAL(12,2) DEFAULT 0,
    "paymentId" VARCHAR(24),
    "lastPaymentError" TEXT,
    "notes" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("customerId") REFERENCES "User"("_id"),
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("facilityUnitTypeOfferingId") REFERENCES "FacilityUnitTypeOffering"("_id"),
    FOREIGN KEY ("storageUnitId") REFERENCES "StorageUnit"("_id"),
    FOREIGN KEY ("receivedBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("assignedBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("confirmedBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("cancelledBy") REFERENCES "User"("_id")
);

CREATE TABLE "ReservationAmenity" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "reservationId" VARCHAR(24) NOT NULL,
    "facilityAmenityOfferingId" VARCHAR(24) NOT NULL,
    "amenityId" VARCHAR(24) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quantity" INT NOT NULL DEFAULT 1,
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "totalPrice" DECIMAL(12,2) NOT NULL,
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("_id"),
    FOREIGN KEY ("facilityAmenityOfferingId") REFERENCES "FacilityAmenityOffering"("_id"),
    FOREIGN KEY ("amenityId") REFERENCES "Amenity"("_id")
);

CREATE TABLE "Contract" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "contractCode" VARCHAR(50) NOT NULL UNIQUE,
    "source" VARCHAR(30) NOT NULL DEFAULT 'reservation',
    "reservationId" VARCHAR(24),
    "customerId" VARCHAR(24) NOT NULL,
    "facilityId" VARCHAR(24) NOT NULL,
    "storageUnitId" VARCHAR(24) NOT NULL,
    "facilityUnitTypeOfferingId" VARCHAR(24) NOT NULL,
    "assignedStaffId" VARCHAR(24),
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "actualCheckInDate" TIMESTAMP,
    "actualCheckOutDate" TIMESTAMP,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "rentalPrice" DECIMAL(12,2) NOT NULL,
    "depositAmount" DECIMAL(12,2) NOT NULL,
    "depositPaidAt" TIMESTAMP,
    "depositPaymentId" VARCHAR(24),
    "totalPeriodicPrice" DECIMAL(12,2) NOT NULL,
    "renewalCount" INT DEFAULT 0,
    "inspectedBy" VARCHAR(24),
    "damageFee" DECIMAL(12,2) DEFAULT 0,
    "overdueFee" DECIMAL(12,2) DEFAULT 0,
    "refundAmount" DECIMAL(12,2) DEFAULT 0,
    "additionalPaymentRequired" DECIMAL(12,2) DEFAULT 0,
    "inspectionNotes" TEXT,
    "cancellationReason" VARCHAR(500),
    "cancelledBy" VARCHAR(24),
    "cancelledAt" TIMESTAMP,
    "terminationReason" VARCHAR(500),
    "terminatedBy" VARCHAR(24),
    "terminatedAt" TIMESTAMP,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "termsAccepted" BOOLEAN DEFAULT FALSE,
    "notes" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("_id"),
    FOREIGN KEY ("customerId") REFERENCES "User"("_id"),
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("storageUnitId") REFERENCES "StorageUnit"("_id"),
    FOREIGN KEY ("facilityUnitTypeOfferingId") REFERENCES "FacilityUnitTypeOffering"("_id"),
    FOREIGN KEY ("assignedStaffId") REFERENCES "User"("_id"),
    FOREIGN KEY ("inspectedBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("cancelledBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("terminatedBy") REFERENCES "User"("_id")
);

CREATE TABLE "ContractAmenity" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "contractId" VARCHAR(24) NOT NULL,
    "facilityAmenityOfferingId" VARCHAR(24) NOT NULL,
    "amenityId" VARCHAR(24) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "quantity" INT NOT NULL DEFAULT 1,
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "billingUnit" VARCHAR(20) NOT NULL DEFAULT 'month',
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "addedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("contractId") REFERENCES "Contract"("_id"),
    FOREIGN KEY ("facilityAmenityOfferingId") REFERENCES "FacilityAmenityOffering"("_id"),
    FOREIGN KEY ("amenityId") REFERENCES "Amenity"("_id")
);

CREATE TABLE "ContractRenewal" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "contractId" VARCHAR(24) NOT NULL,
    "previousEndDate" TIMESTAMP NOT NULL,
    "newEndDate" TIMESTAMP NOT NULL,
    "renewedAt" TIMESTAMP NOT NULL,
    "renewedBy" VARCHAR(24) NOT NULL,
    "note" VARCHAR(500),
    FOREIGN KEY ("contractId") REFERENCES "Contract"("_id"),
    FOREIGN KEY ("renewedBy") REFERENCES "User"("_id")
);

-- ----------------------------------------------------------
-- 5. CỤM PAYMENT & BANKING TRANSACTIONS (TÍM / PURPLE)
-- ----------------------------------------------------------

CREATE TABLE "Payment" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "paymentCode" VARCHAR(50) NOT NULL UNIQUE,
    "purpose" VARCHAR(50) NOT NULL,
    "reservationId" VARCHAR(24),
    "contractId" VARCHAR(24),
    "customerId" VARCHAR(24) NOT NULL,
    "facilityId" VARCHAR(24) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) DEFAULT 0,
    "overpaidAmount" DECIMAL(12,2) DEFAULT 0,
    "method" VARCHAR(50) NOT NULL DEFAULT 'sepay_qr',
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "expiresAt" TIMESTAMP,
    "paidAt" TIMESTAMP,
    "sepayTransactionId" INT,
    "referenceCode" VARCHAR(100),
    "confirmedBy" VARCHAR(24),
    "confirmedAt" TIMESTAMP,
    "cancelledBy" VARCHAR(24),
    "cancelledAt" TIMESTAMP,
    "cancellationReason" VARCHAR(500),
    "note" VARCHAR(1000),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("reservationId") REFERENCES "Reservation"("_id"),
    FOREIGN KEY ("contractId") REFERENCES "Contract"("_id"),
    FOREIGN KEY ("customerId") REFERENCES "User"("_id"),
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id"),
    FOREIGN KEY ("confirmedBy") REFERENCES "User"("_id"),
    FOREIGN KEY ("cancelledBy") REFERENCES "User"("_id")
);

CREATE TABLE "PaymentTransaction" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "sepayId" INT NOT NULL UNIQUE,
    "gateway" VARCHAR(50),
    "transactionDate" VARCHAR(50),
    "accountNumber" VARCHAR(50),
    "subAccount" VARCHAR(50),
    "code" VARCHAR(50),
    "content" TEXT,
    "transferType" VARCHAR(20),
    "transferAmount" DECIMAL(12,2) DEFAULT 0,
    "accumulated" DECIMAL(12,2),
    "referenceCode" VARCHAR(100),
    "description" TEXT,
    "matchedPaymentId" VARCHAR(24),
    "result" VARCHAR(50) NOT NULL DEFAULT 'received',
    "rawPayload" JSON,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("matchedPaymentId") REFERENCES "Payment"("_id")
);

-- ----------------------------------------------------------
-- 6. CỤM GOVERNANCE, AUDIT & NOTIFICATIONS (XÁM / GRAY)
-- ----------------------------------------------------------

CREATE TABLE "ApprovalRequest" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "requesterId" VARCHAR(24) NOT NULL,
    "facilityId" VARCHAR(24) NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(24),
    "payload" JSON NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "approverId" VARCHAR(24),
    "reviewedAt" TIMESTAMP,
    "rejectionReason" VARCHAR(500),
    "reviewNotes" VARCHAR(500),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("requesterId") REFERENCES "User"("_id"),
    FOREIGN KEY ("approverId") REFERENCES "User"("_id"),
    FOREIGN KEY ("facilityId") REFERENCES "Facility"("_id")
);

CREATE TABLE "AuditLog" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "version" INT DEFAULT 1,
    "actorId" VARCHAR(24),
    "actorRole" VARCHAR(50),
    "actorEmail" VARCHAR(255),
    "action" VARCHAR(50) NOT NULL,
    "resourceType" VARCHAR(50) NOT NULL,
    "resourceId" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'success',
    "changes" JSON,
    "metadata" JSON,
    "ip" VARCHAR(50),
    "userAgent" TEXT,
    "requestId" VARCHAR(100),
    "method" VARCHAR(10),
    "path" VARCHAR(255),
    "createdAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("actorId") REFERENCES "User"("_id")
);

CREATE TABLE "Notification" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "recipientId" VARCHAR(24) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "priority" VARCHAR(20) NOT NULL DEFAULT 'normal',
    "channels" TEXT NOT NULL,
    "isRead" BOOLEAN DEFAULT FALSE,
    "readAt" TIMESTAMP,
    "metadata" JSON,
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL,
    FOREIGN KEY ("recipientId") REFERENCES "User"("_id")
);
