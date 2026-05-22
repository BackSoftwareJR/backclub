import React, { useState, useEffect, useRef } from 'react';
import './ItalyMap.css';

interface ItalyMapProps {
  regions: Record<string, any[]>;
  onRegionClick: (regionName: string) => void;
}

// Mapping tra ID SVG e nomi regioni (basato su italy.svg pubblico)
// L'SVG pubblico usa ID con trattino (es. IT-34)
const REGION_ID_TO_NAME: Record<string, string> = {
  'IT-23': "Valle d'Aosta",
  'IT-21': 'Piemonte',
  'IT-42': 'Liguria',
  'IT-25': 'Lombardia',
  'IT-32': 'Trentino-Alto Adige',
  'IT-34': 'Veneto',
  'IT-36': 'Friuli-Venezia Giulia',
  'IT-52': 'Toscana',
  'IT-55': 'Umbria',
  'IT-62': 'Lazio',
  'IT-65': 'Abruzzo',
  'IT-75': 'Puglia',
  'IT-72': 'Campania',
  'IT-67': 'Molise',
  'IT-77': 'Basilicata',
  'IT-78': 'Calabria',
  'IT-82': 'Sicilia',
  'IT-88': 'Sardegna',
  'IT-45': 'Emilia-Romagna',
  'IT-57': 'Marche',
};

// Le coordinate dei numeri vengono ora calcolate dinamicamente dal centro geometrico di ogni path

const ItalyMap: React.FC<ItalyMapProps> = ({ regions, onRegionClick }) => {
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carica l'SVG - prova diversi path possibili
    // Il file è accessibile pubblicamente a https://backclub.it/frontend/dist/italy.svg
    const possibleUrls = [
      '/frontend/dist/italy.svg',
      '/dist/italy.svg',
      '/italy.svg',
      `${window.location.origin}/frontend/dist/italy.svg`,
      `${window.location.origin}/dist/italy.svg`,
      `${import.meta.env.BASE_URL || ''}italy.svg`
    ];
    
    const tryLoadSvg = async (urlIndex: number = 0) => {
      if (urlIndex >= possibleUrls.length) {
        console.error('❌ Tutti i tentativi di caricamento SVG sono falliti');
        return;
      }
      
      const svgUrl = possibleUrls[urlIndex];
      console.log(`🔍 Tentativo ${urlIndex + 1}/${possibleUrls.length}: caricare SVG da:`, svgUrl);
      
      try {
        const res = await fetch(svgUrl, {
          method: 'GET',
          headers: {
            'Accept': 'image/svg+xml, application/xml, text/xml, */*'
          }
        });
        
        console.log('📡 Risposta fetch:', {
          status: res.status,
          statusText: res.statusText,
          ok: res.ok,
          contentType: res.headers.get('content-type'),
          url: res.url,
          redirected: res.redirected
        });
        
        if (!res.ok) {
          console.warn(`⚠️ Risposta non OK (${res.status}), provo il prossimo URL...`);
          return tryLoadSvg(urlIndex + 1);
        }
        
        const contentType = res.headers.get('content-type');
        const text = await res.text();
        
        console.log('📄 Contenuto ricevuto:', {
          length: text.length,
          primiCaratteri: text.substring(0, 200),
          contentType: contentType,
          iniziaConSvg: text.trim().startsWith('<svg'),
          iniziaConXml: text.trim().startsWith('<?xml'),
          iniziaConHtml: text.trim().toLowerCase().startsWith('<!doctype html>')
        });
        
        // Se è HTML, probabilmente è un redirect o fallback
        if (text.trim().toLowerCase().startsWith('<!doctype html>') || text.trim().toLowerCase().startsWith('<html')) {
          console.warn('⚠️ Ricevuto HTML invece di SVG, provo il prossimo URL...');
          return tryLoadSvg(urlIndex + 1);
        }
        
        // Rimuovi eventuali BOM o caratteri invisibili all'inizio
        let cleanedText = text.trim().replace(/^\uFEFF/, '');
        
        // Rimuovi la dichiarazione XML se presente
        cleanedText = cleanedText.replace(/^<\?xml[^>]*\?>\s*/i, '');
        
        // Rimuovi commenti XML prima del tag <svg> (es. <!-- Created for MapSVG plugin... -->)
        // La regex deve gestire commenti multilinea
        cleanedText = cleanedText.replace(/^<!--[\s\S]*?-->\s*/g, '');
        
        // Trova il tag <svg> (case insensitive) e rimuovi tutto ciò che c'è prima
        const svgStartIndex = cleanedText.toLowerCase().indexOf('<svg');
        if (svgStartIndex === -1) {
          console.error('❌ Il file caricato non è un SVG valido - tag <svg> non trovato');
          console.error('Primi 500 caratteri:', cleanedText.substring(0, 500));
          console.error('Tipo di contenuto rilevato:', {
            isHTML: cleanedText.toLowerCase().includes('<!doctype html>'),
            isXML: cleanedText.includes('<?xml'),
            hasSVG: cleanedText.includes('<svg'),
            hasHTML: cleanedText.toLowerCase().includes('<html')
          });
          // Prova il prossimo URL
          return tryLoadSvg(urlIndex + 1);
        }
        
        // Se il tag <svg> non è all'inizio, rimuovi tutto ciò che c'è prima
        if (svgStartIndex > 0) {
          console.log(`⚠️ Tag <svg> trovato alla posizione ${svgStartIndex}, rimuovo i caratteri precedenti`);
          cleanedText = cleanedText.substring(svgStartIndex);
        }
        
        // Rimuovi eventuali spazi bianchi all'inizio dopo aver trovato <svg>
        cleanedText = cleanedText.trim();
        
        console.log('🧹 Dopo pulizia:', {
          length: cleanedText.length,
          primiCaratteri: cleanedText.substring(0, 200),
          iniziaConSvg: cleanedText.startsWith('<svg'),
          primoTag: cleanedText.substring(0, 10)
        });
        
        console.log('✅ SVG valido, impostazione contenuto...');
        setSvgContent(cleanedText);
      } catch (err: any) {
        console.error(`❌ Errore nel caricamento SVG da ${svgUrl}:`, err);
        console.error('Stack:', err.stack);
        // Prova il prossimo URL
        return tryLoadSvg(urlIndex + 1);
      }
    };
    
    tryLoadSvg();
  }, []);

  useEffect(() => {
    if (!svgContent || !svgRef.current) return;

    const svgContainer = svgRef.current;
    
    // Pulisci il contenuto precedente
    svgContainer.innerHTML = '';

    // Assicurati che l'SVG sia valido - rimuovi dichiarazione XML e BOM
    let cleanedSvg = svgContent.trim();
    
    // Rimuovi BOM se presente
    if (cleanedSvg.charCodeAt(0) === 0xFEFF) {
      cleanedSvg = cleanedSvg.slice(1);
    }
    
    // Rimuovi dichiarazione XML se presente
    cleanedSvg = cleanedSvg.replace(/^<\?xml[^>]*\?>\s*/i, '');
    
    // Se non inizia con <svg, potrebbe esserci un problema
    if (!cleanedSvg.trim().startsWith('<svg')) {
      console.error('SVG non valido: non inizia con <svg');
      console.error('Primi caratteri:', cleanedSvg.substring(0, 50));
      return;
    }

    // Usa innerHTML per inserire l'SVG direttamente
    svgContainer.innerHTML = cleanedSvg;
    
    // Ora manipola l'SVG inserito
    const svgElement = svgContainer.querySelector('svg');
    if (!svgElement) {
      console.error('SVG non trovato nel container');
      return;
    }

    // Trova tutti i path delle regioni italiane (l'SVG pubblico usa solo path con id IT-XX)
    const paths = svgElement.querySelectorAll('path[id^="IT-"]');
    
    paths.forEach((element) => {
      const regionId = element.getAttribute('id');
      if (!regionId) return;

      const regionName = REGION_ID_TO_NAME[regionId];
      if (!regionName) return;

      const count = regions[regionName]?.length || 0;
      const isHovered = hoveredRegion === regionName;

      // Applica stili
      element.setAttribute('fill', getRegionColor(count));
      element.setAttribute('opacity', getRegionOpacity(count, isHovered).toString());
      element.setAttribute('class', 'region-path');
      element.setAttribute('style', 'cursor: pointer; transition: all 0.3s ease;');
    });

    // Rimuovi i numeri esistenti
    svgElement.querySelectorAll('.region-count').forEach((el) => el.remove());

    // Calcola il centro geometrico di ogni regione e aggiungi i numeri
    const regionCountElements: Array<{ element: SVGElement; regionName: string }> = [];
    
    paths.forEach((path) => {
      const regionId = path.getAttribute('id');
      if (!regionId) return;

      const regionName = REGION_ID_TO_NAME[regionId];
      if (!regionName) return;

      const count = regions[regionName]?.length || 0;
      
      // Calcola il bounding box del path per trovare il centro
      const bbox = (path as SVGPathElement).getBBox();
      const centerX = bbox.x + bbox.width / 2;
      const centerY = bbox.y + bbox.height / 2;

      // Crea solo il testo del numero (senza background circolare)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', centerX.toString());
      text.setAttribute('y', centerY.toString());
      text.setAttribute('class', 'region-count');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dominant-baseline', 'middle');
      text.setAttribute('data-region', regionName);
      
      // Stile dinamico basato sul conteggio per migliorare la visibilità
      const fontSize = count > 0 ? Math.max(16, Math.min(24, 14 + count / 5)) : 14;
      const fontWeight = count > 0 ? 800 : 600;
      const fillColor = count > 0 ? '#FFFFFF' : '#1d1d1f';
      
      text.setAttribute('style', `cursor: pointer; pointer-events: all; font-weight: ${fontWeight}; font-size: ${fontSize}px; fill: ${fillColor};`);
      text.textContent = count.toString();
      
      // Aggiungi un background rettangolare arrotondato solo se count > 0 per migliorare la leggibilità
      if (count > 0) {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const textWidth = count.toString().length * (fontSize * 0.6);
        const rectWidth = Math.max(textWidth + 12, 28);
        const rectHeight = fontSize + 8;
        const rx = 6; // border-radius
        
        rect.setAttribute('x', (centerX - rectWidth / 2).toString());
        rect.setAttribute('y', (centerY - rectHeight / 2).toString());
        rect.setAttribute('width', rectWidth.toString());
        rect.setAttribute('height', rectHeight.toString());
        rect.setAttribute('rx', rx.toString());
        rect.setAttribute('ry', rx.toString());
        rect.setAttribute('class', 'region-count-bg');
        rect.setAttribute('data-region', regionName);
        rect.setAttribute('style', 'cursor: pointer; pointer-events: all;');
        
        // Inserisci prima il rettangolo, poi il testo
        svgElement.appendChild(rect);
        regionCountElements.push({ element: rect, regionName });
      }
      
      // Salva l'associazione per gli event listeners
      regionCountElements.push({ element: text, regionName });
      svgElement.appendChild(text);
    });

    // Aggiungi event listeners dopo che l'SVG è stato inserito nel DOM
    const clickHandlers: Array<{ element: Element; handler: () => void }> = [];
    const hoverHandlers: Array<{ element: Element; enterHandler: () => void; leaveHandler: () => void }> = [];

    const insertedPaths = svgContainer.querySelectorAll('path[id^="IT-"]');
    insertedPaths.forEach((element) => {
      const regionId = element.getAttribute('id');
      if (!regionId) return;

      const regionName = REGION_ID_TO_NAME[regionId];
      if (!regionName) return;

      const clickHandler = () => onRegionClick(regionName);
      const enterHandler = () => setHoveredRegion(regionName);
      const leaveHandler = () => setHoveredRegion(null);

      element.addEventListener('click', clickHandler);
      element.addEventListener('mouseenter', enterHandler);
      element.addEventListener('mouseleave', leaveHandler);

      clickHandlers.push({ element, handler: clickHandler });
      hoverHandlers.push({ element, enterHandler, leaveHandler });
    });

    // Aggiungi event listeners ai numeri e ai loro background usando l'attributo data-region
    regionCountElements.forEach(({ element, regionName }) => {
      const clickHandler = () => onRegionClick(regionName);
      element.addEventListener('click', clickHandler);
      clickHandlers.push({ element, handler: clickHandler });
    });

    // Cleanup function
    return () => {
      clickHandlers.forEach(({ element, handler }) => {
        element.removeEventListener('click', handler);
      });
      hoverHandlers.forEach(({ element, enterHandler, leaveHandler }) => {
        element.removeEventListener('mouseenter', enterHandler);
        element.removeEventListener('mouseleave', leaveHandler);
      });
    };
  }, [svgContent, regions, hoveredRegion, onRegionClick]);

  // Scala di colori con gradazioni ogni 5 contatti (0-75+)
  // Usa una progressione dal grigio chiaro al verde intenso
  const getRegionColor = (count: number): string => {
    if (count === 0) return '#86868b'; // Grigio per 0 contatti
    
    // Scala verde con gradazioni ogni 5
    if (count >= 1 && count <= 5) return '#A8E6CF';      // Verde molto chiaro
    if (count >= 6 && count <= 10) return '#88D8A3';     // Verde chiaro
    if (count >= 11 && count <= 15) return '#6BCF7F';    // Verde medio-chiaro
    if (count >= 16 && count <= 20) return '#4EC97B';   // Verde medio
    if (count >= 21 && count <= 25) return '#34C759';    // Verde standard
    if (count >= 26 && count <= 30) return '#30D158';    // Verde brillante
    if (count >= 31 && count <= 35) return '#32D74B';    // Verde vivace
    if (count >= 36 && count <= 40) return '#28CD41';    // Verde intenso
    if (count >= 41 && count <= 45) return '#1ED760';   // Verde acceso
    if (count >= 46 && count <= 50) return '#1AB954';    // Verde profondo
    if (count >= 51 && count <= 55) return '#169F47';    // Verde scuro
    if (count >= 56 && count <= 60) return '#12853A';    // Verde molto scuro
    if (count >= 61 && count <= 65) return '#0E6B2E';    // Verde quasi nero
    if (count >= 66 && count <= 70) return '#0A5122';    // Verde molto scuro
    if (count >= 71 && count <= 75) return '#063716';    // Verde quasi nero
    return '#021F0F'; // Verde quasi nero per 75+
  };

  const getRegionOpacity = (count: number, isHovered: boolean): number => {
    if (isHovered) return 1;
    if (count === 0) return 0.3;
    return 0.7;
  };

  if (!svgContent) {
    return (
      <div className="italy-map-container">
        <div className="venditori-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="italy-map-container">
      <div 
        ref={svgRef}
        className="italy-map-wrapper"
      />
      
      {/* Legenda con scala completa */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#86868b' }}></div>
          <span className="legend-label">0</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#A8E6CF' }}></div>
          <span className="legend-label">1-5</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#88D8A3' }}></div>
          <span className="legend-label">6-10</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#6BCF7F' }}></div>
          <span className="legend-label">11-15</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4EC97B' }}></div>
          <span className="legend-label">16-20</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#34C759' }}></div>
          <span className="legend-label">21-25</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#30D158' }}></div>
          <span className="legend-label">26-30</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#32D74B' }}></div>
          <span className="legend-label">31-35</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#28CD41' }}></div>
          <span className="legend-label">36-40</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#1ED760' }}></div>
          <span className="legend-label">41-45</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#1AB954' }}></div>
          <span className="legend-label">46-50</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#169F47' }}></div>
          <span className="legend-label">51-55</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#12853A' }}></div>
          <span className="legend-label">56-60</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#0E6B2E' }}></div>
          <span className="legend-label">61-65</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#0A5122' }}></div>
          <span className="legend-label">66-70</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#063716' }}></div>
          <span className="legend-label">71-75</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#021F0F' }}></div>
          <span className="legend-label">75+</span>
        </div>
      </div>
    </div>
  );
};

export default ItalyMap;
