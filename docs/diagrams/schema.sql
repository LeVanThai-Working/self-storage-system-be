-- ==========================================================
-- SELF STORAGE SYSTEM - DATABASE LOGICAL SCHEMA (SQL DDL)
-- Dùng để import trực tiếp vào Draw.io:
-- Menu: Arrange (Sắp xếp) -> Insert (Chèn) -> Advanced (Nâng cao) -> SQL...
-- ==========================================================

-- 1. Cụm Identity & Authentication
CREATE TABLE "User" (
    "_id" VARCHAR(24) PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "password" VARCHAR(255),
    "phoneNumber" VARCHAR(11),
    "googleId" VARCHAR(255) UNIQUE,
    "role" VARCHAR(50) NOT NULL DEFAULT 'customer',
    "authProvider" VARCHAR(20) NOT NULL DEFAULT 'local',
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "isEmailVerified" BOOLEAN DEFAULT FALSE,
    "assignedFacilityId" VARCHAR(24),
    "deleted" BOOLEAN DEFAULT FALSE,
    "deletedAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP NOT NULL
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
    "createdAt" TIMESTAMP NOT NULL
);

-- 2. Cụm Master Catalog & Facilities
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

-- 3. Cụm Offerings & Physical Storage Units
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

-- 4. Cụm Governance & Audit Trail
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
