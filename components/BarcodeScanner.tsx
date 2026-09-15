"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, SwitchCamera, Zap } from "lucide-react";

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: Props) {
  const scannerRef = useRef<any>(null);
  const mountedRef = useRef(true);
  const [error, setError] = useState("");
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [camIdx, setCamIdx] = useState(0);
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const lastCodeRef = useRef("");
  const lastTimeRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode");

        const devices = await Html5Qrcode.getCameras();
        if (!devices?.length) {
          setError("No se detectó ninguna cámara.");
          return;
        }
        if (!mountedRef.current) return;

        setCameras(devices.map((d) => ({ id: d.id, label: d.label || "Cámara" })));

        const backIdx = devices.findIndex((d) => /back|trasera|rear|environment/i.test(d.label));
        const startIdx = backIdx >= 0 ? backIdx : 0;
        setCamIdx(startIdx);

        const scanner = new Html5Qrcode("barcode-reader", {
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
          ],
        });
        scannerRef.current = scanner;

          await scanner.start(
            devices[startIdx]?.id ? devices[startIdx].id : { facingMode: "environment" },
            {
              fps: 15,
              // ELIMINA experimentalFeatures DE AQUÍ
              videoConstraints: {
                width: { min: 640, ideal: 1280 },
                height: { min: 480, ideal: 720 },
                facingMode: "environment",
              },
            },
            (text: string) => {
            const now = Date.now();
            if (text === lastCodeRef.current && now - lastTimeRef.current < 2000) return;
            lastCodeRef.current = text;
            lastTimeRef.current = now;
            if (navigator.vibrate) navigator.vibrate(100);
            onScan(text.trim());
          },
          () => {}
        );

        if (mountedRef.current) setReady(true);
      } catch (err: any) {
        if (!mountedRef.current) return;
        if (/permission|denied/i.test(err?.message || "")) {
          setError("Permiso de cámara denegado. Habilítalo en la configuración.");
        } else {
          setError("No se pudo iniciar la cámara.");
        }
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      const s = scannerRef.current;
      if (s) {
        s.stop()
          .then(() => s.clear())
          .catch(() => {
            try {
              s.clear();
            } catch {}
          });
        scannerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = async () => {
    if (cameras.length < 2 || !scannerRef.current) return;
    const nextIdx = (camIdx + 1) % cameras.length;
    try {
      await scannerRef.current.stop();
      await scannerRef.current.start(
        cameras[nextIdx].id,
        {
          fps: 15,
          videoConstraints: {
            width: { min: 640, ideal: 1280 },
            height: { min: 480, ideal: 720 },
          },
        },
        (text: string) => {
          const now = Date.now();
          if (text === lastCodeRef.current && now - lastTimeRef.current < 2000) return;
          lastCodeRef.current = text;
          lastTimeRef.current = now;
          if (navigator.vibrate) navigator.vibrate(100);
          onScan(text.trim());
        },
        () => {}
      );
      setCamIdx(nextIdx);
    } catch {}
  };

  const toggleTorch = async () => {
    if (!scannerRef.current) return;
    try {
      const caps = scannerRef.current.getRunningTrackCameraCapabilities?.();
      if (caps?.torchFeature?.isSupported()) {
        await caps.torchFeature.apply(!torch);
        setTorch(!torch);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div
        className="rounded-xl w-full max-w-sm overflow-hidden"
        style={{ background: "var(--kipu-surface)", border: "1px solid var(--kipu-border)" }}
      >
        {/* Encabezado */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid var(--kipu-border)" }}
        >
          <div className="flex items-center gap-2">
            <Camera size={16} style={{ color: "var(--kipu-accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--kipu-text)" }}>
              Escanear código
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={switchCamera}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--kipu-subtle)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--kipu-text)";
                  e.currentTarget.style.background = "var(--kipu-bg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--kipu-subtle)";
                  e.currentTarget.style.background = "transparent";
                }}
                title="Cambiar cámara"
              >
                <SwitchCamera size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={toggleTorch}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: torch ? "var(--kipu-warning)" : "var(--kipu-subtle)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--kipu-bg)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              title="Linterna"
            >
              <Zap size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: "var(--kipu-subtle)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--kipu-danger)";
                e.currentTarget.style.background =
                  "color-mix(in srgb, var(--kipu-danger) 10%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--kipu-subtle)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Visor de la cámara con guía visual en CSS */}
        <div className="relative w-full h-[300px] bg-black overflow-hidden flex items-center justify-center">
          <div id="barcode-reader" className="w-full h-full" />

          {/* Marco decorativo que no recorta el procesamiento de imagen */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-[85%] h-[45%] border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        </div>

        <style>{`
          #barcode-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
          #barcode-reader img[alt="end"] { display: none !important; }
          #barcode-reader > div:nth-child(2) { display: none !important; }
          #barcode-reader__scan_region > img { display: none !important; }
          #barcode-reader__dashboard { display: none !important; }
          #barcode-reader__header_message { display: none !important; }
        `}</style>

        {!ready && !error && (
          <div className="flex items-center justify-center py-4 gap-2">
            <div
              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--kipu-accent)", borderTopColor: "transparent" }}
            />
            <span className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
              Iniciando cámara...
            </span>
          </div>
        )}

        {error && (
          <div
            className="px-4 py-3 text-xs text-center"
            style={{
              color: "var(--kipu-danger)",
              background: "color-mix(in srgb, var(--kipu-danger) 10%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        <div className="px-4 py-3 text-center">
          <p className="text-xs" style={{ color: "var(--kipu-subtle)" }}>
            Centra el código dentro de la retícula
          </p>
          <p className="text-[10px] mt-1" style={{ color: "var(--kipu-subtle)" }}>
            EAN-13 · EAN-8 · Code128 · Code39 · UPC-A · UPC-E · QR
          </p>
        </div>
      </div>
    </div>
  );
}