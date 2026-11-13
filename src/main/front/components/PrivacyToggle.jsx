import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export const VALOR_OCULTO = '••••';

export default function PrivacyToggle({ ativo, aoAlternar }) {
    const Icon = ativo ? EyeOff : Eye;
    return (
        <button type="button" className="btn btn-secondary privacy-toggle"
            aria-pressed={ativo} onClick={aoAlternar}
            title={ativo ? 'Mostrar valores da carteira' : 'Ocultar valores da carteira'}>
            <Icon size={18} aria-hidden="true" />
            Modo privacidade
        </button>
    );
}
