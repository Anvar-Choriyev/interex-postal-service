import React, { useState } from "react";
import AttentionError from "../../../../assets/icons/AttentionError";
import CircleCheck from "../../../../assets/icons/CircleCheck";
import styles from "./Input.module.css";

function Input({
  type,
  register,
  placeholder,
  id,
  error,
  children,
  style,
  disabled,
  onClick,
  checked,
  onChange,
  value,
  defaultValue,
}) {
  const [success, setSuccess] = useState(false);
  // console.log(checked);
  // useEffect(() => {})
  return (
    <div className={styles.formControl}>
      {children && (
        <label className={styles.label} htmlFor={id ? id : ""}>
          {children}
        </label>
      )}
      <div className={styles.inputContainer}>
        <input
          defaultChecked={checked}
          disabled={disabled}
          style={style}
          type={type ? type : "text"}
          onWheel={() => document.activeElement.blur()}
          placeholder={placeholder ? placeholder : ""}
          id={id ? id : ""}
          defaultValue={defaultValue}
          value={value}
          {...(register ? register() : "")}
          className={`${styles.input} ${error ? styles.error : ""}`}
          onClick={onClick}
          onChange={onChange}
        />
      </div>

      <p className={error ? styles.errorText : styles.errorTextNone}>
        {error ? error : "default Error"}
      </p>
    </div>
  );
}

export default Input;
