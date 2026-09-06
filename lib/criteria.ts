export type Category = "laptop" | "phone";

export interface CriterionDef {
  key: string;
  label: string;
  cost: boolean; // true = lower is better
  hint: string;
}

export const CRITERIA: Record<Category, CriterionDef[]> = {
  laptop: [
    { key: "price", label: "Giá", cost: true, hint: "Giá bán" },
    { key: "cpu", label: "CPU", cost: false, hint: "Hiệu năng vi xử lý" },
    { key: "ram", label: "RAM", cost: false, hint: "Đa nhiệm" },
    { key: "gpu", label: "GPU", cost: false, hint: "Đồ hoạ" },
    { key: "storage", label: "Dung lượng", cost: false, hint: "Ổ cứng" },
    { key: "display", label: "Màn hình", cost: false, hint: "Kích thước/chất lượng" },
    { key: "portability", label: "Tính di động", cost: true, hint: "Càng nhỏ càng dễ mang" },
    { key: "battery", label: "Pin", cost: false, hint: "Thời lượng (ước lượng)" },
  ],
  phone: [
    { key: "price", label: "Giá", cost: true, hint: "Giá bán" },
    { key: "performance", label: "Hiệu năng", cost: false, hint: "Sức mạnh tổng thể" },
    { key: "storageRam", label: "RAM + Bộ nhớ", cost: false, hint: "Đa nhiệm & lưu trữ" },
    { key: "camera", label: "Camera", cost: false, hint: "Chụp/quay" },
    { key: "display", label: "Màn hình", cost: false, hint: "Chất lượng hiển thị" },
    { key: "battery", label: "Pin", cost: false, hint: "Thời lượng (ước lượng)" },
    { key: "durability", label: "Độ bền", cost: false, hint: "Kháng nước/bụi" },
  ],
};

export const costKeys = (c: Category) =>
  new Set(CRITERIA[c].filter((x) => x.cost).map((x) => x.key));
