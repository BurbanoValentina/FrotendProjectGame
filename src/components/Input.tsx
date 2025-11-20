import React from "react";

type NativeInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

interface InputProps extends NativeInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input: React.FC<InputProps> = ({
  value,
  onChange,
  type = "text",
  className,
  disabled = false,
  ...rest
}) => {
  return (
    <input
      className={`input${className ? ` ${className}` : ""}`}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      {...rest}
    />
  );
};

export default Input;
