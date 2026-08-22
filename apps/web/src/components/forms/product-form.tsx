"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCreateProduct, useUpdateProduct } from "@/hooks/use-api";
import { X, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

// Validation schema
const ProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name must be 200 characters or less"),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive("Price must be greater than 0"),
  costPrice: z.number().min(0).optional(),
  unit: z.string().min(1, "Unit is required"),
  categoryId: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProductFormData = z.infer<typeof ProductSchema>;

interface ProductFormProps {
  open: boolean;
  onClose: () => void;
  product?: {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    price: number;
    costPrice?: number;
    unit: string;
    categoryId?: string;
    aliases?: string[];
    lowStockThreshold?: number;
    imageUrl?: string;
  };
  onSuccess?: () => void;
}

export function ProductForm({ open, onClose, product, onSuccess }: ProductFormProps) {
  const isEditing = !!product;

  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    sku: "",
    description: "",
    price: 0,
    costPrice: 0,
    unit: "piece",
    categoryId: "",
    aliases: [],
    lowStockThreshold: 10,
    imageUrl: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aliasInput, setAliasInput] = useState("");

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || "",
        sku: product.sku || "",
        description: product.description || "",
        price: product.price || 0,
        costPrice: product.costPrice || 0,
        unit: product.unit || "piece",
        categoryId: product.categoryId || "",
        aliases: product.aliases || [],
        lowStockThreshold: product.lowStockThreshold || 10,
        imageUrl: product.imageUrl || "",
      });
    } else {
      setFormData({
        name: "",
        sku: "",
        description: "",
        price: 0,
        costPrice: 0,
        unit: "piece",
        categoryId: "",
        aliases: [],
        lowStockThreshold: 10,
        imageUrl: "",
      });
    }
    setErrors({});
    setAliasInput("");
  }, [product, open]);

  const validate = (): boolean => {
    try {
      ProductSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const field = err.path.join(".");
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      if (isEditing) {
        await updateProduct.mutateAsync({
          id: product.id,
          data: {
            ...formData,
            price: formData.price,
            costPrice: formData.costPrice || undefined,
            lowStockThreshold: formData.lowStockThreshold || undefined,
            imageUrl: formData.imageUrl || undefined,
          },
        });
      } else {
        await createProduct.mutateAsync({
          ...formData,
          price: formData.price,
          costPrice: formData.costPrice || undefined,
          lowStockThreshold: formData.lowStockThreshold || undefined,
          imageUrl: formData.imageUrl || undefined,
        });
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Failed to save product:", error);
      setErrors({ submit: "Failed to save product. Please try again." });
    }
  };

  const handleAddAlias = () => {
    if (aliasInput.trim() && !formData.aliases?.includes(aliasInput.trim())) {
      setFormData({
        ...formData,
        aliases: [...(formData.aliases || []), aliasInput.trim()],
      });
      setAliasInput("");
    }
  };

  const handleRemoveAlias = (alias: string) => {
    setFormData({
      ...formData,
      aliases: formData.aliases?.filter((a) => a !== alias) || [],
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddAlias();
    }
  };

  if (!open) return null;

  const isSubmitting = createProduct.isPending || updateProduct.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{isEditing ? "Edit Product" : "Add Product"}</CardTitle>
              <CardDescription>
                {isEditing ? "Update product details" : "Add a new product to your catalog"}
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Product Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Malta Guinness 50cl"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    placeholder="e.g., MGU-50CL"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Brief product description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Pricing & Inventory</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">
                    Selling Price (₦) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.price || ""}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className={errors.price ? "border-red-500" : ""}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="costPrice">Cost Price (₦)</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.costPrice || ""}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">
                    Unit <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="unit"
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="piece">Piece</option>
                    <option value="carton">Carton</option>
                    <option value="bag">Bag</option>
                    <option value="keg">Keg</option>
                    <option value="tin">Tin</option>
                    <option value="pack">Pack</option>
                    <option value="crate">Crate</option>
                    <option value="bottle">Bottle</option>
                    <option value="kg">Kilogram</option>
                    <option value="litre">Litre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                  <Input
                    id="lowStockThreshold"
                    type="number"
                    min="0"
                    placeholder="10"
                    value={formData.lowStockThreshold || ""}
                    onChange={(e) => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alert when stock falls below this number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className={errors.imageUrl ? "border-red-500" : ""}
                  />
                  {errors.imageUrl && (
                    <p className="text-sm text-red-500">{errors.imageUrl}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Aliases */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Product Aliases
                <span className="font-normal text-muted-foreground ml-2">
                  (Alternative names customers might use)
                </span>
              </h3>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., malt, guinness"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" onClick={handleAddAlias}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.aliases && formData.aliases.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.aliases.map((alias) => (
                    <Badge key={alias} variant="secondary" className="gap-1">
                      {alias}
                      <button
                        type="button"
                        onClick={() => handleRemoveAlias(alias)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Profit Preview */}
            {formData.price > 0 && formData.costPrice > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Profit Preview</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Selling Price</p>
                    <p className="font-medium">₦{formData.price.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cost Price</p>
                    <p className="font-medium">₦{formData.costPrice.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit per Unit</p>
                    <p className="font-medium text-green-600">
                      ₦{(formData.price - formData.costPrice).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? "Saving..."
                  : isEditing
                  ? "Save Changes"
                  : "Add Product"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
