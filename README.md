# DecisionDesk — Hệ hỗ trợ quyết định chọn Laptop & Điện thoại

Web app (Next.js, static export) giúp chọn **laptop** hoặc **điện thoại** phù hợp nhất theo
**nhu cầu + ngân sách**, dùng:

- **AHP** (Analytic Hierarchy Process) — so sánh cặp tiêu chí để tính **trọng số**, kèm
  **Consistency Ratio (CR)** kiểm tra tính nhất quán.
- **TOPSIS** — xếp hạng sản phẩm theo trọng số AHP.

Deploy: **Cloudflare Pages** → https://uit-dss.pages.dev

## Luồng
Trang chủ → Chọn thiết bị → Ngân sách → **So sánh cặp AHP** (trọng số + CR) → **Kết quả TOPSIS**
→ Chi tiết / So sánh.

## Kiến trúc
```
data/*.csv                 Dữ liệu gốc (laptop, smartphone)
scripts/build-data.mjs     CSV → lib/products.generated.json (precompute lúc build)
lib/criteria.ts            Định nghĩa tiêu chí (8 laptop / 7 phone) + cost/benefit
lib/ahp.ts                 AHP: ma trận so sánh cặp → trọng số (geometric mean) + CR
lib/topsis.ts              TOPSIS: chuẩn hoá vector → điểm phù hợp 0–100
app/                       Giao diện (Next.js App Router, client-side)
```

> **Tiền tệ:** hiển thị `$` (USD). Giá trong dataset là số gốc không đổi; đổi ký hiệu không ảnh
> hưởng thứ hạng AHP/TOPSIS (bất biến theo tỉ lệ).

> **Về dữ liệu:** các cột có thật trong CSV (giá, RAM, bộ nhớ, CPU/GPU chuỗi, kích thước màn…)
> được dùng trực tiếp; một số tiêu chí không có sẵn (pin, tính di động, camera…) được **ước lượng**
> từ cấu hình theo `scripts/build-data.mjs` — giống bản tham chiếu.

## Chạy local
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # xuất tĩnh ra out/
```

## Deploy tự động
Mỗi lần push lên `main`, GitHub Actions (`.github/workflows/deploy.yml`) build và deploy lên
Cloudflare Pages. Cần 2 **GitHub Secrets**:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

(Không commit token vào repo.)
