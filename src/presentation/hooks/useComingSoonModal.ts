"use client";

import { useCallback, useState } from "react";

interface ComingSoonModalState {
  isOpen: boolean;
  featureName: string | undefined;
}

export function useComingSoonModal() {
  const [state, setState] = useState<ComingSoonModalState>({
    isOpen: false,
    featureName: undefined,
  });

  const showComingSoon = useCallback((featureName?: string) => {
    setState({
      isOpen: true,
      featureName,
    });
  }, []);

  const hideComingSoon = useCallback(() => {
    setState({
      isOpen: false,
      featureName: undefined,
    });
  }, []);

  return {
    isOpen: state.isOpen,
    featureName: state.featureName,
    showComingSoon,
    hideComingSoon,
  };
}
