"use client";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function StepAddressDetails({
  formData,
  setFormData,
  error,
}: {
  formData: any;
  setFormData: (data: any) => void;
  error?: string | null;
}) {
  const [touched, setTouched] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [countries, setCountries] = useState<string[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // Fetch countries on component mount
  useEffect(() => {
    const fetchCountries = async () => {
      setLoadingCountries(true);
      try {
        const response = await fetch("/api/countries");
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (error) {
        console.error("Error fetching countries:", error);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, []);

  const updateField = (key: string, value: string) => {
    setFormData({ ...formData, [key]: value });
    setTouched({ ...touched, [key]: true });
    validateField(key, value);

    // Clear state when country changes
    if (key === "country") {
      setFormData((prev: any) => ({ ...prev, state: "" }));
    }
  };

  const validateField = (key: string, value: string) => {
    let error = "";
    if (!value) {
      error = "This field is required.";
    } else if (key === "postal" && !/^\d{4,10}$/.test(value)) {
      error = "Enter a valid postal code.";
    }
    setErrors((prev: any) => ({ ...prev, [key]: error }));
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-red-600 text-sm font-montserrat mb-2">{error}</div>
      )}
      <div className="flex flex-col gap-4">
        {/* Address Line */}
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="address">Address Line</Label>
          <Input
            id="address"
            placeholder="e.g., 12 Adewole Crescent"
            value={formData.address || ""}
            onChange={(e) => updateField("address", e.target.value)}
            onBlur={() => validateField("address", formData.address)}
            className={
              touched.address && errors.address ? "border-red-500" : ""
            }
          />
          {touched.address && errors.address && (
            <span className="text-red-600 text-xs font-montserrat">
              {errors.address}
            </span>
          )}
        </div>

        {/* City */}
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            placeholder="e.g., Abuja"
            value={formData.city || ""}
            onChange={(e) => updateField("city", e.target.value)}
            onBlur={() => validateField("city", formData.city)}
            className={touched.city && errors.city ? "border-red-500" : ""}
          />
          {touched.city && errors.city && (
            <span className="text-red-600 text-xs font-montserrat">
              {errors.city}
            </span>
          )}
        </div>

        {/* Country (from API) */}
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="country">Country</Label>
          <Select
            value={formData.country || ""}
            onValueChange={(value) => updateField("country", value)}
          >
            <SelectTrigger
              className={
                touched.country && errors.country ? "border-red-500" : ""
              }
            >
              <SelectValue
                placeholder={
                  loadingCountries ? "Loading countries..." : "Select a country"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country} value={country}>
                  {country}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched.country && errors.country && (
            <span className="text-red-600 text-xs font-montserrat">
              {errors.country}
            </span>
          )}
        </div>

        {/* State (now just input, no API select) */}
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            placeholder="e.g., Lagos"
            value={formData.state || ""}
            onChange={(e) => updateField("state", e.target.value)}
            onBlur={() => validateField("state", formData.state)}
            className={touched.state && errors.state ? "border-red-500" : ""}
          />
          {touched.state && errors.state && (
            <span className="text-red-600 text-xs font-montserrat">
              {errors.state}
            </span>
          )}
        </div>

        {/* Postal Code */}
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="postal">Postal Code</Label>
          <Input
            id="postal"
            placeholder="e.g., 900211"
            value={formData.postal || ""}
            onChange={(e) => {
              // Only allow numbers
              const val = e.target.value.replace(/[^\d]/g, "");
              updateField("postal", val);
            }}
            onBlur={() => validateField("postal", formData.postal)}
            className={touched.postal && errors.postal ? "border-red-500" : ""}
            inputMode="numeric"
            pattern="[0-9]*"
          />
          {touched.postal && errors.postal && (
            <span className="text-red-600 text-xs font-montserrat">
              {errors.postal}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
