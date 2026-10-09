"use client";

import { useCallback, useState } from "react";

interface ComingSoonModalState {
  isOpen: boolean;
  featureName: string | undefined;
  detail: string | undefined;
}

export function useComingSoonModal() {
  const [state, setState] = useState<ComingSoonModalState>({
    isOpen: false,
    featureName: undefined,
    detail: undefined,
  });

  /** @param detail บอกเหตุผลสั้น ๆ ว่าทำไมยังใช้ไม่ได้ (ถ้าไม่มีจะขึ้นข้อความมาตรฐาน) */
  const showComingSoon = useCallback(
    (featureName?: string, detail?: string) => {
      setState({
        isOpen: true,
        featureName,
        detail,
      });
    },
    [],
  );

  const hideComingSoon = useCallback(() => {
    setState({
      isOpen: false,
      featureName: undefined,
      detail: undefined,
    });
  }, []);

  return {
    isOpen: state.isOpen,
    featureName: state.featureName,
    detail: state.detail,
    showComingSoon,
    hideComingSoon,
  };
}
