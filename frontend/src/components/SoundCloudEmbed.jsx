import { useEffect, useRef } from "react";

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

export default function SoundCloudEmbed({ embedHtml, onMetadataLoaded }) {
  const containerRef = useRef(null);
  const onMetadataRef = useRef(onMetadataLoaded);
  onMetadataRef.current = onMetadataLoaded;

  useEffect(() => {
    if (!embedHtml) return;

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
  }, [embedHtml]);

  if (!embedHtml) return null;

  return (
    <div
      ref={containerRef}
      dangerouslySetInnerHTML={{ __html: embedHtml }}
    />
  );
}
