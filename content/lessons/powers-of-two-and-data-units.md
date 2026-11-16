---
slug: powers-of-two-and-data-units
title: "Powers of Two & Data Units"
topic: estimation-and-capacity
kind: concept
summary: "Master mental math for capacity planning: powers of two, decimal vs binary prefixes, and byte conversions."
tags: [estimation, math, capacity-planning, powers-of-two]
related: [latency-numbers-every-engineer-should-know, estimating-qps-and-bandwidth, estimating-storage-and-memory]
---
> **In one line:** Rapid capacity estimation relies on mental powers of two, where 2^10 is roughly one thousand, 2^20 one million, and 2^30 one billion.

## The idea
Back-of-the-envelope calculations require rapid mental approximations. In software engineering, data structures, memory addresses, and network buffers are anchored in binary representation ($2^n$), while human reporting and disk specifications typically use decimal units ($10^n$). Bridging both systems in your head is an indispensable skill.

The fundamental rule of thumb is that every ten powers of two ($2^{10}$) approximately equals three orders of magnitude in decimal ($10^3$):
- $2^{10} = 1,024 \approx 1,000$ (One Thousand / Kilo)
- $2^{20} = 1,048,576 \approx 1,000,000$ (One Million / Mega)
- $2^{30} = 1,073,741,824 \approx 1,000,000,000$ (One Billion / Giga)
- $2^{40} = 1,099,511,627,776 \approx 1,000,000,000,000$ (One Trillion / Tera)
- $2^{50} \approx 1,000,000,000,000,000$ (One Quadrillion / Peta)

This equivalence allows engineers to solve complex capacity planning problems in seconds. If an index requires 32 bytes per entry and you must store one billion records, the memory required is simply $32 \text{ bytes} \times 10^9 \approx 32 \text{ Gigabytes}$. If you need a unique 64-bit integer identifier for every user event, $2^{64} \approx 1.8 \times 10^{19}$ identifiers ensures you will never exhaust keys even at billions of events per second for centuries.

## See it
The relationship between binary powers and decimal approximations:

| Power of 2 | Exact Value | Decimal Approximation | Storage Prefix (Binary / Decimal) | Typical System Quantity |
|---|---|---|---|---|
| $2^{10}$ | 1,024 | $10^3$ (Thousand) | KiB (Kibibyte) / KB (Kilobyte) | Small JSON payload (1–5 KB) |
| $2^{20}$ | 1,048,576 | $10^6$ (Million) | MiB (Mebibyte) / MB (Megabyte) | Compressed image / small video clip |
| $2^{30}$ | 1,073,741,824 | $10^9$ (Billion) | GiB (Gibibyte) / GB (Gigabyte) | RAM on a standard server node |
| $2^{40}$ | 1,099,511,627,776 | $10^{12}$ (Trillion) | TiB (Tebibyte) / TB (Terabyte) | NVMe SSD storage disk |
| $2^{50}$ | 1,125,899,906,842,624 | $10^{15}$ (Quadrillion) | PiB (Pebibyte) / PB (Petabyte) | Analytics data warehouse cluster |

```bash
# Mental math verification in node / python
# 2^32 address space:
node -e "console.log('2^32 bytes =', (2**32 / 1024**3).toFixed(2), 'GiB')"
# Output: 2^32 bytes = 4.00 GiB (Why 32-bit systems had 4 GB RAM limits)

# Estimating 500 million records of 200 bytes:
# 500 * 10^6 * 200 B = 100,000 * 10^6 B = 100 * 10^9 B = 100 GB
```

> **Tip:** Remember that network bandwidth is measured in **bits** per second (e.g., 1 Gbps), whereas storage is measured in **bytes** (1 GB). Because 1 byte = 8 bits, a 1 Gbps link transfers at most 125 MB/s of raw payload.

## Go deeper
The distinction between binary prefixes (KiB = 1,024 bytes) and decimal prefixes (KB = 1,000 bytes) was standardized by the IEC in 1998. Disk drive manufacturers market drives using decimal gigabytes ($10^9$), whereas operating systems report capacity in binary gibibytes ($2^{30}$). This discrepancy is why a "1 Terabyte" drive appears as approximately 931 GiB in your operating system.
## Watch out
- Do not confuse bits (b) with bytes (B); network transit speeds are quoted in bits, while memory and disk are quoted in bytes.
- In back-of-the-envelope estimation, do not waste time calculating exact values like 1,048,576; round to 1 million for speed.
## Remember
- Every 10 powers of two ($2^{10}$) roughly equals one decimal order of three ($10^3$).
- $2^{10} \approx 1\text{K}$, $2^{20} \approx 1\text{M}$, $2^{30} \approx 1\text{G}$, $2^{40} \approx 1\text{T}$.
- Always multiply or divide by 8 when converting between network bandwidth (bits) and storage (bytes).
