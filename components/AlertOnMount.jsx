"use client";

import { useEffect } from "react";

export default function AlertOnMount({ message }) {
  useEffect(() => {
    if (message) {
      window.alert(message);
    }
  }, [message]);

  return null;
}
