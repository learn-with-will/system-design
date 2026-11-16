---
slug: encryption-in-transit-and-at-rest
title: "Encryption in Transit & at Rest"
topic: operations-and-security
kind: technique
summary: "Protect sensitive data across its lifecycle: TLS 1.3, AES-256-GCM, envelope encryption, and Key Management Services (KMS)."
tags: [encryption, security, kms, envelope-encryption, aes]
related: [tls-and-https, secret-management-and-key-rotation, defense-in-depth]
---
> **In one line:** Data must be encrypted in transit via TLS to prevent network eavesdropping, and encrypted at rest via envelope encryption to protect underlying physical disks.

## The idea
Data exists in three states: **Data in Transit** (moving across network wires), **Data at Rest** (stored in non-volatile disks, databases, and backup files), and **Data in Use** (actively processed in CPU registers and RAM). A resilient architecture must protect data across its entire lifecycle.

**1. Encryption in Transit:**
Prevents eavesdropping, packet sniffing, and man-in-the-middle attacks as data travels between clients and servers, or between internal microservices. Enforced using **TLS 1.3** and mutual TLS (mTLS). Modern cloud providers also automatically encrypt all physical fiber traffic between datacenters at the physical link layer (MACsec).

**2. Encryption at Rest:**
Ensures that if an adversary physically steals a hard drive from a datacenter, steals an unencrypted database backup file, or gains unauthorized access to storage snapshots, they cannot read the underlying plaintext. Standardized on **AES-256** (Advanced Encryption Standard with 256-bit keys) in Galois/Counter Mode (GCM).

**Envelope Encryption:**
Encrypting gigabytes of data directly with a single Master Key stored in a central Key Management Service (KMS) is computationally slow and creates an extreme network bottleneck. Modern architectures use **Envelope Encryption**:
1. When storing an object, the application calls KMS to generate a unique **Data Encryption Key (DEK)**.
2. KMS returns two versions of the DEK: a **plaintext DEK** and the **DEK encrypted under the Master Key (KEK)**.
3. The application encrypts the local data using the plaintext DEK via high-speed hardware AES-GCM instructions locally.
4. The application immediately erases the plaintext DEK from memory and stores the *encrypted DEK* alongside the encrypted data ciphertext!
5. To decrypt later, the application sends only the encrypted DEK to KMS to decrypt, and uses the resulting DEK to decrypt the data locally.

## See it
Trace the Envelope Encryption workflow combining local speed with central key protection:

```sequence
actor app: Application Service @primary
actor kms: Key Management Service | Holds KEK @blue
actor disk: Storage / S3 | Ciphertext @green
app -> kms: GenerateDataKey(MasterKeyId)
kms --> app: Plaintext DEK + Encrypted DEK
note app: Encrypt payload locally with AES-GCM
note app: Wipe Plaintext DEK from RAM
app -> disk: Store [Ciphertext + Encrypted DEK]
```

```yaml
# AWS S3 Bucket Encryption configuration enforcing KMS Envelope Encryption
BucketEncryption:
  ServerSideEncryptionConfiguration:
    - ServerSideEncryptionByDefault:
        SSEAlgorithm: "aws:kms"
        KMSMasterKeyId: "arn:aws:kms:us-east-1:123456789:key/a1b2c3d4-e5f6"
      BucketKeyEnabled: true # Caches DEKs to slash KMS API costs by 99%
```

> **Tip:** Envelope encryption allows you to rotate your central Master Key in KMS without re-encrypting petabytes of historical data on disk; only the tiny encrypted DEKs need to be re-wrapped!

## Go deeper
**Application-Level (Field-Level) Encryption:**
While cloud disk encryption (e.g., EBS encryption) protects against physical theft of hard drives, any database administrator or compromised application process with SQL access can still read the plaintext. For ultra-sensitive fields (SSNs, credit card numbers, health records), systems use **Field-Level Encryption**: encrypting individual column attributes in application code before inserting them into the database.
## Watch out
- Never hardcode encryption keys in source code or commit them to Git repositories.
- Remember to enable AWS KMS `BucketKeyEnabled`; un-cached envelope encryption on millions of S3 objects can generate thousands of dollars in KMS API request charges.
## Remember
- Data in transit is protected by TLS 1.3; data at rest is protected by AES-256.
- Envelope encryption encrypts data locally with a Data Key and protects the Data Key with a KMS Master Key.
- Use field-level encryption for high-risk attributes (PII, SSNs) to protect data from compromised database administrators.
