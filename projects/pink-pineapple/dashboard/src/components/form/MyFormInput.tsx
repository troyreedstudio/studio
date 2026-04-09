"use client";
import { useState, useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Image from "next/image";

interface RadioOption {
  value: string;
  label: string;
  image?: string;
}

interface MyFormInputProps {
  type?: string;
  name: string;
  label?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  labelClassName?: string;
  inputClassName?: string;
  rows?: number;
  radioOptions?: RadioOption[];
  radioGroupClassName?: string;
  radioLabelClassName?: string;
  radioInputClassName?: string;
  radioImageClassName?: string;
  radioItemClassName?: string;
  isMultiple?: boolean;
  disabled?: boolean;
  filePlaceholder?: string;
  acceptType?: "image/*";
}

const MyFormInput = ({
  type = "text",
  name,
  label,
  onValueChange,
  placeholder = "",
  required = true,
  className,
  labelClassName,
  inputClassName,
  rows,
  radioOptions,
  radioGroupClassName,
  radioLabelClassName,
  radioInputClassName,
  radioImageClassName,
  radioItemClassName,
  isMultiple = false,
  disabled = false,
  filePlaceholder,
  acceptType,
}: MyFormInputProps) => {
  const { control, getValues, setValue } = useFormContext();
  const inputValue = useWatch({ control, name }) ?? ""; // Ensure no undefined value
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [preview, setPreview] = useState<string[] | null>([]);

  useEffect(() => {
    if (onValueChange) {
      onValueChange(inputValue);
    }
  }, [inputValue, onValueChange]);

  useEffect(() => {
    if (type === "radio" && radioOptions?.length) {
      setValue(name, getValues(name) ?? radioOptions[0].value);
    }
  }, [type, radioOptions, name, setValue, getValues]);

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label && (
        <label
          htmlFor={name}
          className={cn("mb-1 text-xs text-[#B0B0B0] uppercase tracking-widest", labelClassName)}
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {label}
        </label>
      )}
      <Controller
        name={name}
        control={control}
        defaultValue={getValues(name) ?? radioOptions?.[0]?.value ?? ""} // Ensures controlled behavior
        rules={
          required
            ? {
                required: `${
                  label ? `${label} is required` : "This field is required"
                }`,
              }
            : {}
        }
        render={({ field, fieldState: { error } }) => (
          <div className="relative">
            {/* File Input Handling */}
            {type === "file" ? (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor={name}
                  className={cn(
                    "border border-[#2A2A2A] rounded-xl p-6 flex flex-col items-center justify-center bg-[#000000] cursor-pointer hover:bg-[#1A1A1A] transition-colors relative overflow-hidden",
                    "min-h-[100px]",
                    error ? "border-red-500" : "",
                    inputClassName
                  )}
                >
                  {preview && preview.length > 0 ? (
                    <div className="absolute inset-0 w-full h-full flex md:gap-6 gap-3 justify-center p-2">
                      {preview.map((item, idx) => (
                        <Image
                          key={idx}
                          src={item}
                          alt={`Preview ${idx + 1}`}
                          fill={false}
                          width={100}
                          height={100}
                          className="object-contain"
                        />
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="text-[#C4707E] mb-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                      </div>
                      <p className="text-[#B0B0B0] text-center" style={{ fontFamily: 'Poppins, sans-serif' }}>
                        {filePlaceholder || "Upload Image"}
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    id={name}
                    accept={acceptType}
                    multiple={isMultiple}
                    className="hidden"
                    disabled={disabled}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const fileArray = Array.from(files);
                        const valueToSet = isMultiple
                          ? fileArray
                          : fileArray[0];
                        setValue(name, valueToSet);
                        field.onChange(valueToSet);

                        const previewUrls = fileArray.map((file) =>
                          URL.createObjectURL(file)
                        );
                        setPreview(previewUrls);
                      }
                    }}
                  />
                </label>
              </div>
            ) : type === "textarea" ? (
              <textarea
                {...field}
                id={name}
                placeholder={placeholder}
                rows={rows || 3}
                disabled={disabled}
                className={cn(
                  "w-full px-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C4707E] border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] placeholder:text-[#6B6B6B] transition-colors",
                  error ? "border-red-500" : "hover:border-[#3A3A3A]",
                  inputClassName
                )}
                value={field.value ?? ""}
              />
            ) : type === "radio" && radioOptions ? (
              <div className={cn("flex flex-col gap-2", radioGroupClassName)}>
                {radioOptions?.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2",
                      radioLabelClassName
                    )}
                  >
                    <input
                      {...field}
                      type="radio"
                      value={option.value}
                      disabled={disabled}
                      checked={field.value === option.value}
                      className={cn("form-radio", radioInputClassName)}
                    />
                    <div className={cn("flex gap-2", radioItemClassName)}>
                      {option?.image && (
                        <Image
                          src={option.image || "/placeholder.svg"}
                          alt={option.label}
                          width={100}
                          height={100}
                          className={cn("w-6 h-6", radioImageClassName)}
                        />
                      )}
                      <div>{option.label}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <input
                {...field}
                id={name}
                placeholder={placeholder}
                type={
                  type === "password"
                    ? isPasswordVisible
                      ? "text"
                      : "password"
                    : type
                }
                className={cn(
                  "w-full px-4 py-3 text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-[#C4707E] border border-[#2A2A2A] bg-[#000000] text-[#FFFFFF] placeholder:text-[#6B6B6B] transition-colors",
                  error ? "border-red-500" : "hover:border-[#3A3A3A]",
                  inputClassName
                )}
                value={field.value ?? ""}
                disabled={disabled}
              />
            )}
            {/* Password Toggle Button */}
            {type === "password" && (
              <button
                type="button"
                onClick={() => setIsPasswordVisible((prev) => !prev)}
                className="absolute right-3 top-1/3 transform -translate-y-1/2 text-[#B0B0B0] hover:text-[#C4707E] transition-colors"
              >
                {isPasswordVisible ? (
                  <FiEye size={20} />
                ) : (
                  <FiEyeOff size={20} />
                )}
              </button>
            )}
            {/* Validation Error Message */}
            <div className="h-4 mb-1">
              {error && (
                <small className="text-red-500 text-xs">{error.message}</small>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default MyFormInput;
