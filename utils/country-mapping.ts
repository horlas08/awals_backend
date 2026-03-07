export const mapCountryCode = (code: string | null | undefined): string | null => {
    if (!code) return null;
    const mapping: { [key: string]: string } = {
        'SA': 'saudi',
        'AE': 'uae',
        'KW': 'kuwait',
        'QA': 'qatar',
        'BH': 'bahrain',
        'OM': 'oman',
        'EG': 'egypt',
    };
    return mapping[code.toUpperCase()] || code.toLowerCase();
};
