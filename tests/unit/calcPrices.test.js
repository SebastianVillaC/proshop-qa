// Pruebas unitarias de backend/utils/calcPrices.js
// Técnicas: partición de equivalencia (PE) y análisis de valores límite (VL)
// Regla de negocio (RF06): envío gratis si itemsPrice > 100, si no 10; IVA 15 %.
import { calcPrices } from '../../app/backend/utils/calcPrices.js';

const item = (price, qty = 1) => ({ price, qty });

describe('calcPrices - regla de envío (valores límite alrededor de 100)', () => {
  test.each([
    // [descripción, items, envío esperado]
    ['VL inferior: 99.99 -> paga envío', [item(99.99)], '10.00'],
    ['VL exacto: 100.00 -> paga envío (la regla es estrictamente > 100)', [item(100)], '10.00'],
    ['VL superior: 100.01 -> envío gratis', [item(100.01)], '0.00'],
    ['PE clase "subtotal bajo": 50.00', [item(25, 2)], '10.00'],
    ['PE clase "subtotal alto": 929.99', [item(929.99)], '0.00'],
  ])('%s', (_desc, items, expectedShipping) => {
    expect(calcPrices(items).shippingPrice).toBe(expectedShipping);
  });
});

describe('calcPrices - impuesto del 15 % y total', () => {
  test('carrito vacío (PE: sin items) -> sólo cobra envío', () => {
    expect(calcPrices([])).toEqual({
      itemsPrice: '0.00',
      shippingPrice: '10.00',
      taxPrice: '0.00',
      totalPrice: '10.00',
    });
  });

  test('un producto real del catálogo (Airpods 89.99)', () => {
    expect(calcPrices([item(89.99)])).toEqual({
      itemsPrice: '89.99',
      shippingPrice: '10.00',
      taxPrice: '13.50',
      totalPrice: '113.49',
    });
  });

  test('varios productos y cantidades se acumulan', () => {
    const r = calcPrices([item(599.99, 2), item(29.99, 3)]);
    expect(r.itemsPrice).toBe('1289.95');
    expect(r.shippingPrice).toBe('0.00');
    expect(r.taxPrice).toBe('193.49');
    expect(r.totalPrice).toBe('1483.44');
  });

  test('redondeo a 2 decimales del impuesto (10.05 * 0.15 = 1.5075 -> 1.51)', () => {
    expect(calcPrices([item(10.05)]).taxPrice).toBe('1.51');
  });

  test('evita errores de coma flotante (0.1 x 3 = 0.30)', () => {
    expect(calcPrices([item(0.1, 3)]).itemsPrice).toBe('0.30');
  });

  test('devuelve siempre strings con 2 decimales', () => {
    const r = calcPrices([item(1)]);
    Object.values(r).forEach((v) => expect(v).toMatch(/^-?\d+\.\d{2}$/));
  });
});
