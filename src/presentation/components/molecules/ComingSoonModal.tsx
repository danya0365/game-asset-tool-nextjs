"use client";

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export function ComingSoonModal({
  isOpen,
  onClose,
  featureName,
}: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="ie-dialog" onClick={onClose}>
      <div
        className="ie-dialog-content min-w-[320px] max-w-[400px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="ie-dialog-header">
          <div className="flex items-center gap-2">
            <span className="text-sm">🚧</span>
            <span className="ie-dialog-title">Under Development</span>
          </div>
          <button
            onClick={onClose}
            className="ie-titlebar-btn ie-titlebar-close"
            title="Close"
          >
            <span>×</span>
          </button>
        </div>

        {/* Dialog Body */}
        <div className="ie-dialog-body">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="text-4xl">🔧</div>

            {/* Message */}
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground mb-2">
                กำลังพัฒนา
              </p>
              <p className="text-xs text-muted mb-2">
                {featureName ? (
                  <>
                    ฟีเจอร์ <strong>&quot;{featureName}&quot;</strong>{" "}
                    กำลังอยู่ในระหว่างการพัฒนา
                  </>
                ) : (
                  <>ฟีเจอร์นี้กำลังอยู่ในระหว่างการพัฒนา</>
                )}
              </p>
              <p className="text-xs text-muted">
                โปรดรอติดตามการอัปเดตในเวอร์ชันถัดไป
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted">
                Development Progress
              </span>
              <span className="text-muted">
                Coming Soon...
              </span>
            </div>
            <div className="ie-progress">
              <div className="ie-progress-bar w-[30%]" />
            </div>
          </div>
        </div>

        {/* Dialog Footer */}
        <div className="ie-dialog-footer">
          <button className="ie-button" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
