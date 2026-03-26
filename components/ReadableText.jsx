import { Fragment } from "react";

function punctuatedSegments(text) {
  return String(text ?? "").split(/([.,]\s*)/g);
}

function renderReadableContent(text) {
  return punctuatedSegments(text).map((segment, index) => {
    if (!segment) {
      return null;
    }

    const shouldAllowBreakAfter = /^[.,]\s*$/.test(segment);

    return (
      <Fragment key={`${segment}-${index}`}>
        {segment}
        {shouldAllowBreakAfter ? <wbr /> : null}
      </Fragment>
    );
  });
}

export default function ReadableText({
  as: Component = "p",
  className,
  children,
  ...props
}) {
  if (typeof children !== "string") {
    return (
      <Component className={className} {...props}>
        {children}
      </Component>
    );
  }

  return (
    <Component className={className} {...props}>
      {renderReadableContent(children)}
    </Component>
  );
}
