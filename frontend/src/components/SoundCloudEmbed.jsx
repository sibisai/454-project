import { useEffect, useRef, useMemo } from "react";
import DOMPurify from "dompurify";

let _loadPromise = null;
function loadSCWidgetAPI() {
  if (!_loadPromise) {
    _loadPromise = new Promise((resolve, reject) => {
      if (window.SC?.Widget) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://w.soundcloud.com/player/api.js";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return _loadPromise;
}

export default function SoundCloudEmbed({ embedHtml, artworkUrl, onMetadataLoaded }) {
  const containerRef = useRef(null);
  const onMetadataRef = useRef(onMetadataLoaded);
  onMetadataRef.current = onMetadataLoaded;

  const sanitizedHtml = useMemo(
    () => embedHtml
      ? DOMPurify.sanitize(embedHtml, {
          ALLOWED_TAGS: ['iframe'],
          ALLOWED_ATTR: ['src', 'width', 'height', 'scrolling', 'frameborder', 'allow'],
        })
      : '',
    [embedHtml]
  );

  useEffect(() => {
    if (!sanitizedHtml) return;

    let widget = null;

    loadSCWidgetAPI()
      .then(() => {
        const iframe = containerRef.current?.querySelector("iframe");
        if (!iframe || !window.SC?.Widget) return;

        widget = window.SC.Widget(iframe);
        widget.bind(window.SC.Widget.Events.READY, () => {
          widget.getCurrentSound((sound) => {
            if (!sound) return;
            onMetadataRef.current?.({
              title: sound.title,
              artist_name: sound.user?.username,
              artwork_url: sound.artwork_url,
            });
          });
        });
      })
      .catch(() => {
        // Widget API unavailable — player still works, just no metadata
      });

    return () => {
      if (widget && window.SC?.Widget?.Events) {
        widget.unbind(window.SC.Widget.Events.READY);
      }
    };
  }, [sanitizedHtml]);

  if (!sanitizedHtml) return null;

  return (
    <div className="sc-embed-dark">
      {artworkUrl && (
        <img className="sc-artwork-overlay" src={artworkUrl} alt="" loading="lazy" />
      )}
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
