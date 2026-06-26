import React, { useState, useEffect } from 'react';
import { ChevronDown, Globe, Loader, Check } from 'lucide-react';
import organicWebApi, { type GscProperty } from '../../../../api/organicWeb';

interface GscPropertySelectorProps {
    projectId: number;
    currentPropertyUrl: string | null;
    onPropertySelected: (propertyUrl: string) => void;
}

const GscPropertySelector: React.FC<GscPropertySelectorProps> = ({
    projectId,
    currentPropertyUrl,
    onPropertySelected,
}) => {
    const [properties, setProperties] = useState<GscProperty[]>([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadProperties();
    }, [projectId]);

    const loadProperties = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await organicWebApi.getGscProperties(projectId);
            setProperties(res.properties);
        } catch (err) {
            setError('Errore nel caricamento delle proprietà');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProperty = async (propertyUrl: string) => {
        if (propertyUrl === currentPropertyUrl) {
            setIsOpen(false);
            return;
        }

        setSelecting(true);
        try {
            await organicWebApi.selectGscProperty(projectId, propertyUrl);
            setIsOpen(false);
            onPropertySelected(propertyUrl);
        } catch (err) {
            setError('Errore nella selezione della proprietà');
            console.error(err);
        } finally {
            setSelecting(false);
        }
    };

    const getDisplayUrl = (url: string) => {
        try {
            const parsed = new URL(url);
            return parsed.hostname.replace('www.', '');
        } catch {
            return url;
        }
    };

    if (loading) {
        return (
            <div className="ow-gsc-property-selector">
                <Loader size={14} className="ws-spin" />
                <span className="ow-gsc-property-label">Caricamento proprietà...</span>
            </div>
        );
    }

    if (error || properties.length === 0) {
        return null;
    }

    const currentProperty = properties.find(p => p.url === currentPropertyUrl);
    const hasMultipleProperties = properties.length > 1;

    if (!hasMultipleProperties && currentProperty) {
        return (
            <div className="ow-gsc-property-selector ow-gsc-property-selector--single">
                <Globe size={12} />
                <span className="ow-gsc-property-label">{getDisplayUrl(currentProperty.url)}</span>
            </div>
        );
    }

    return (
        <div className="ow-gsc-property-dropdown">
            <button
                className="ow-gsc-property-trigger"
                onClick={() => setIsOpen(!isOpen)}
                disabled={selecting}
            >
                <Globe size={12} />
                <span className="ow-gsc-property-current">
                    {currentProperty ? getDisplayUrl(currentProperty.url) : 'Seleziona proprietà'}
                </span>
                {!currentProperty && properties.length > 0 && (
                    <span className="ow-gsc-property-count">{properties.length} disponibili</span>
                )}
                <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            {isOpen && (
                <>
                    <div className="ow-gsc-property-backdrop" onClick={() => setIsOpen(false)} />
                    <div className="ow-gsc-property-menu">
                        {properties.map((property) => (
                            <button
                                key={property.url}
                                className={`ow-gsc-property-item ${property.url === currentPropertyUrl ? 'ow-gsc-property-item--active' : ''}`}
                                onClick={() => handleSelectProperty(property.url)}
                                disabled={selecting}
                            >
                                <div className="ow-gsc-property-item-left">
                                    <Globe size={12} />
                                    <span className="ow-gsc-property-item-url">
                                        {getDisplayUrl(property.url)}
                                    </span>
                                </div>
                                {property.url === currentPropertyUrl && (
                                    <Check size={12} style={{ color: 'var(--ws-green)' }} />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default GscPropertySelector;
