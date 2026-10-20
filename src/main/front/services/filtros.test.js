import { describe, expect, it } from 'vitest';
import { correspondeAoFiltro, opcoesUnicas } from './filtros';

describe('filtros de tabelas', () => {
    it('ignora acentos, maiusculas e espacos no filtro', () => {
        expect(correspondeAoFiltro('  AUREA ', ['Áurea Investimentos'])).toBe(true);
        expect(correspondeAoFiltro('VALE', ['PETR4', 'VALE3'])).toBe(true);
        expect(correspondeAoFiltro('IBM', ['PETR4'])).toBe(false);
    });

    it('aceita filtro vazio e ignora valores ausentes', () => {
        expect(correspondeAoFiltro('', [])).toBe(true);
        expect(correspondeAoFiltro('PETR', [null, undefined])).toBe(false);
    });

    it('remove opcoes vazias e duplicadas e ordena os valores', () => {
        expect(opcoesUnicas([' VALE3 ', '', null, 'PETR4', 'VALE3'])).toEqual(['PETR4', 'VALE3']);
    });
});
