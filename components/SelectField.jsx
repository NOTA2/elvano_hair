"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { createPortal } from "react-dom";

function normalizeOptions(children) {
  return Children.toArray(children)
    .filter((child) => isValidElement(child) && child.type === "option")
    .map((child, index) => ({
      key: child.key || `${index}-${child.props.value ?? ""}`,
      value: String(child.props.value ?? ""),
      label: Children.toArray(child.props.children).join(""),
      disabled: Boolean(child.props.disabled)
    }));
}

export default function SelectField({
  children,
  className = "",
  wrapperClassName = "",
  value,
  defaultValue,
  onChange,
  name,
  placeholder = "선택",
  disabled = false,
  invalid = false
}) {
  const instanceId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const options = useMemo(() => normalizeOptions(children), [children]);
  const isControlled = value !== undefined;
  const initialValue = isControlled
    ? String(value ?? "")
    : String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? "");
  const [internalValue, setInternalValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState(null);
  const [placement, setPlacement] = useState("bottom");
  const currentValue = isControlled ? String(value ?? "") : internalValue;
  const selectedOption = options.find((option) => option.value === currentValue) || null;
  const listboxId = `${instanceId}-listbox`;
  const portalTarget =
    typeof document !== "undefined"
      ? rootRef.current?.closest("dialog") || document.body
      : null;

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        !rootRef.current?.contains(event.target) &&
        !popoverRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current || typeof window === "undefined") {
      return;
    }

    function updatePosition() {
      const rect = triggerRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 12;
      const preferredWidth = Math.max(rect.width, 220);
      const width = Math.min(preferredWidth, viewportWidth - margin * 2);
      const left = Math.min(
        Math.max(rect.left, margin),
        viewportWidth - width - margin
      );
      const maxHeight = Math.min(320, viewportHeight - margin * 2 - 60);
      const spaceBelow = viewportHeight - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const nextPlacement =
        spaceBelow >= 260 || spaceBelow >= spaceAbove ? "bottom" : "top";
      const top =
        nextPlacement === "bottom"
          ? Math.min(rect.bottom + 8, viewportHeight - margin)
          : Math.max(rect.top - 8, margin);

      setPlacement(nextPlacement);
      setPopoverStyle({
        position: "fixed",
        left,
        top,
        width,
        maxHeight
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  function commitValue(nextValue) {
    if (!isControlled) {
      setInternalValue(nextValue);
    }

    onChange?.({
      target: {
        value: nextValue,
        name
      }
    });

    setIsOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className={`select-field ${isOpen ? "open" : ""} ${disabled ? "disabled" : ""} ${invalid ? "invalid" : ""} ${wrapperClassName}`.trim()}
    >
      {name ? <input type="hidden" name={name} value={currentValue} /> : null}
      <button
        ref={triggerRef}
        type="button"
        className={`select-field-trigger ${className}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-invalid={invalid}
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open);
          }
        }}
        disabled={disabled}
      >
        <span className={`select-field-value ${selectedOption ? "selected" : "placeholder"}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="select-field-icon" aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none">
            <path d="m5 7.5 5 5 5-5" />
          </svg>
        </span>
      </button>

      {isOpen && popoverStyle
        ? createPortal(
            <div
              ref={popoverRef}
              className={`select-field-popover ${placement === "top" ? "top" : "bottom"}`}
              style={popoverStyle}
            >
              <div className="select-field-options" role="listbox" id={listboxId}>
                {options.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    role="option"
                    aria-selected={option.value === currentValue}
                    className={`select-field-option ${option.value === currentValue ? "selected" : ""}`}
                    disabled={option.disabled}
                    onClick={() => {
                      if (!option.disabled) {
                        commitValue(option.value);
                      }
                    }}
                  >
                    <span className="select-field-option-label">{option.label || placeholder}</span>
                  </button>
                ))}
              </div>
            </div>,
            portalTarget
          )
        : null}
    </div>
  );
}
