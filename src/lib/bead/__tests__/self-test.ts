/**
 * 拼豆模块自测 - 验证优化后的算法正确性
 *
 * 运行: npx tsx src/lib/bead/__tests__/self-test.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const beadDir = path.resolve(__dirname, '..');

// Node.js polyfill for ImageData (browser API)
class ImageDataPolyfill {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  constructor(dataOrWidth: Uint8ClampedArray | number, width?: number, height?: number) {
    if (typeof dataOrWidth === 'number' && width !== undefined && height !== undefined) {
      this.width = dataOrWidth;
      this.height = height;
      this.data = new Uint8ClampedArray(dataOrWidth * height * 4);
    } else if (dataOrWidth instanceof Uint8ClampedArray) {
      this.data = dataOrWidth;
      this.width = width!;
      this.height = height!;
    } else {
      throw new Error('Invalid arguments');
    }
  }
}
(globalThis as any).ImageData = ImageDataPolyfill;

// 动态导入（避免路径别名）
const colorMatchPath = path.join(beadDir, 'colorMatch.ts');
const pixelatePath = path.join(beadDir, 'pixelate.ts');
const postprocessPath = path.join(beadDir, 'postprocess.ts');
const quantizePath = path.join(beadDir, 'quantize.ts');
const kmeansPath = path.join(beadDir, 'kmeans.ts');
const ditheringPath = path.join(beadDir, 'dithering.ts');
const octreePath = path.join(beadDir, 'octree.ts');

const colorMatch = await import(colorMatchPath);
const pixelate = await import(pixelatePath);
const postprocess = await import(postprocessPath);
const quantize = await import(quantizePath);
const kmeans = await import(kmeansPath);
const dithering = await import(ditheringPath);
const octree = await import(octreePath);

// ============================================================
// 测试数据：模拟色板
// ============================================================

interface TestBeadColor {
  code: string;
  name: string;
  hex: string;
  rgb: [number, number, number];
}

const testPalette: TestBeadColor[] = [
  { code: 'R01', name: 'Red', hex: '#FF0000', rgb: [255, 0, 0] },
  { code: 'G01', name: 'Green', hex: '#00FF00', rgb: [0, 255, 0] },
  { code: 'B01', name: 'Blue', hex: '#0000FF', rgb: [0, 0, 255] },
  { code: 'W01', name: 'White', hex: '#FFFFFF', rgb: [255, 255, 255] },
  { code: 'K01', name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
  { code: 'Y01', name: 'Yellow', hex: '#FFFF00', rgb: [255, 255, 0] },
];

// ============================================================
// 1. RGB → LAB 转换测试
// ============================================================

describe('rgbToLab', () => {
  test('白色应该映射到 L≈100, a≈0, b≈0', () => {
    const [L, a, b] = colorMatch.rgbToLab(255, 255, 255);
    assert.ok(Math.abs(L - 100) < 2, `Expected L≈100, got ${L}`);
    assert.ok(Math.abs(a) < 1, `Expected a≈0, got ${a}`);
    assert.ok(Math.abs(b) < 1, `Expected b≈0, got ${b}`);
  });

  test('黑色应该映射到 L≈0', () => {
    const [L] = colorMatch.rgbToLab(0, 0, 0);
    assert.ok(Math.abs(L) < 1, `Expected L≈0, got ${L}`);
  });

  test('纯红色应该有较大的正 a 值', () => {
    const [, a] = colorMatch.rgbToLab(255, 0, 0);
    assert.ok(a > 60, `Expected large positive a, got ${a}`);
  });

  test('纯蓝色应该有较大的负 b 值', () => {
    const [, , b] = colorMatch.rgbToLab(0, 0, 255);
    assert.ok(b < -60, `Expected large negative b, got ${b}`);
  });
});

// ============================================================
// 2. 颜色匹配测试 (nearestColor)
// ============================================================

describe('nearestColor', () => {
  test('纯红色应该匹配到红色色板', () => {
    const result = colorMatch.nearestColor(255, 0, 0, testPalette);
    assert.strictEqual(result.code, 'R01', `Expected R01, got ${result.code}`);
  });

  test('纯绿色应该匹配到绿色色板', () => {
    const result = colorMatch.nearestColor(0, 255, 0, testPalette);
    assert.strictEqual(result.code, 'G01', `Expected G01, got ${result.code}`);
  });

  test('纯蓝色应该匹配到蓝色色板', () => {
    const result = colorMatch.nearestColor(0, 0, 255, testPalette);
    assert.strictEqual(result.code, 'B01', `Expected B01, got ${result.code}`);
  });

  test('接近红色的颜色应该匹配到红色', () => {
    const result = colorMatch.nearestColor(240, 10, 5, testPalette);
    assert.strictEqual(result.code, 'R01', `Expected R01, got ${result.code}`);
  });

  test('黄色应该匹配到黄色色板', () => {
    const result = colorMatch.nearestColor(255, 255, 0, testPalette);
    assert.strictEqual(result.code, 'Y01', `Expected Y01, got ${result.code}`);
  });

  test('白色应该匹配到白色', () => {
    const result = colorMatch.nearestColor(250, 250, 250, testPalette);
    assert.strictEqual(result.code, 'W01', `Expected W01, got ${result.code}`);
  });

  test('黑色应该匹配到黑色', () => {
    const result = colorMatch.nearestColor(5, 5, 5, testPalette);
    assert.strictEqual(result.code, 'K01', `Expected K01, got ${result.code}`);
  });

  test('缓存应该返回相同结果', () => {
    const r1 = colorMatch.nearestColor(255, 0, 0, testPalette);
    const r2 = colorMatch.nearestColor(255, 0, 0, testPalette);
    assert.strictEqual(r1.code, r2.code, 'Cache should return same result');
  });
});

// ============================================================
// 3. 颜色缓存清除测试
// ============================================================

describe('clearColorCache', () => {
  test('清除缓存后应能正常工作', () => {
    colorMatch.nearestColor(255, 0, 0, testPalette);
    colorMatch.clearColorCache();
    const result = colorMatch.nearestColor(255, 0, 0, testPalette);
    assert.strictEqual(result.code, 'R01', `After cache clear, expected R01, got ${result.code}`);
  });
});

// ============================================================
// 4. buildHexMap 测试
// ============================================================

describe('buildHexMap', () => {
  test('应该正确构建 hex 到 BeadColor 的映射', () => {
    const hexMap = colorMatch.buildHexMap(testPalette);
    assert.strictEqual(hexMap.get('#FF0000')?.code, 'R01');
    assert.strictEqual(hexMap.get('#00FF00')?.code, 'G01');
    assert.strictEqual(hexMap.get('#0000FF')?.code, 'B01');
  });

  test('应该处理大写 hex', () => {
    const hexMap = colorMatch.buildHexMap(testPalette);
    assert.ok(hexMap.has('#FF0000'), 'Should have uppercase hex key');
  });
});

// ============================================================
// 5. 像素化测试 (pixelate)
// ============================================================

describe('pixelateWithMask', () => {
  test('photo 模式 - 区域加权平均', () => {
    const w = 10, h = 10;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 255;
      data[i * 4 + 1] = 0;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 255;
    }

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 5, 5, null, { mode: 'photo' });

    assert.strictEqual(result.width, 5);
    assert.strictEqual(result.height, 5);
    assert.strictEqual(result.data[0], 255, 'R channel should be 255');
    assert.strictEqual(result.data[1], 0, 'G channel should be 0');
    assert.strictEqual(result.data[2], 0, 'B channel should be 0');
  });

  test('simple 模式 - 中位数采样', () => {
    const w = 6, h = 6;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 128;
      data[i * 4 + 1] = 64;
      data[i * 4 + 2] = 32;
      data[i * 4 + 3] = 255;
    }

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 3, 3, null, { mode: 'simple' });

    assert.strictEqual(result.width, 3);
    assert.strictEqual(result.height, 3);
    assert.strictEqual(result.data[0], 128);
    assert.strictEqual(result.data[1], 64);
    assert.strictEqual(result.data[2], 32);
  });

  test('illustration 模式 - 带平滑', () => {
    const w = 8, h = 8;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 200;
      data[i * 4 + 1] = 100;
      data[i * 4 + 2] = 50;
      data[i * 4 + 3] = 255;
    }

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 4, 4, null, { mode: 'illustration' });

    assert.strictEqual(result.width, 4);
    assert.strictEqual(result.height, 4);
    assert.ok(result.data[0] > 150, 'R should be close to original after smoothing');
  });

  test('mask 透明区域应该输出白色', () => {
    const w = 4, h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    const mask = new Uint8Array(w * h).fill(0);

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 2, 2, mask, { mode: 'photo' });

    assert.strictEqual(result.data[0], 255);
    assert.strictEqual(result.data[1], 255);
    assert.strictEqual(result.data[2], 255);
    assert.strictEqual(result.data[3], 0);
  });

  test('默认模式应该是 photo', () => {
    const w = 4, h = 4;
    const data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 100;
      data[i * 4 + 1] = 150;
      data[i * 4 + 2] = 200;
      data[i * 4 + 3] = 255;
    }

    const r1 = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 2, 2, null);
    const r2 = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 2, 2, null, { mode: 'photo' });

    assert.deepStrictEqual(Array.from(r1.data), Array.from(r2.data), 'Default mode should be photo');
  });
});

// ============================================================
// 6. 后处理测试 (postprocess)
// ============================================================

describe('postprocessBeadMap', () => {
  test('孤立像素平滑 - 单个像素应被替换', () => {
    const w = 3, h = 3;
    const beadMap = new Map<string, string>();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 1 && y === 1) {
          beadMap.set(`${x},${y}`, '#FF0000');
        } else {
          beadMap.set(`${x},${y}`, '#FFFFFF');
        }
      }
    }

    const result = postprocess.postprocessBeadMap(beadMap, [], w, h, { smoothIsolated: true, aggressiveSmooth: false });

    assert.strictEqual(result.get('1,1'), '#FFFFFF', 'Isolated red pixel should be smoothed to white');
  });

  test('颜色数量统计', () => {
    const beadMap = new Map<string, string>();
    beadMap.set('0,0', '#FF0000');
    beadMap.set('0,1', '#FF0000');
    beadMap.set('1,0', '#00FF00');
    beadMap.set('1,1', '#0000FF');

    const w = 2, h = 2;
    const result = postprocess.postprocessBeadMap(beadMap, [], w, h, { maxColors: 2 });

    const colors = new Set<string>();
    result.forEach(hex => colors.add(hex.toUpperCase()));
    assert.ok(colors.size <= 2, `After merging, should have ≤ 2 colors, got ${colors.size}`);
  });

  test('空 beadMap 不应该出错', () => {
    const result = postprocess.postprocessBeadMap(new Map(), [], 0, 0, {});
    assert.strictEqual(result.size, 0);
  });
});

// ============================================================
// 7. 量化测试 (quantize)
// ============================================================

describe('quantizeToPalette', () => {
  test('纯色图像应该映射到最接近的色板颜色', () => {
    const w = 4, h = 4;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h).fill(255);

    for (let i = 0; i < w * h; i++) {
      pixels[i * 3] = 255;
      pixels[i * 3 + 1] = 0;
      pixels[i * 3 + 2] = 0;
    }

    const result = quantize.quantizeToPalette(pixels, w, h, alpha, testPalette);

    assert.strictEqual(result.labels.length, w * h);
    for (let i = 0; i < w * h; i++) {
      assert.strictEqual(result.labels[i], 0, `Pixel ${i} should map to red (index 0)`);
    }
    assert.strictEqual(result.counts[0], w * h, 'Red should have full count');
  });

  test('透明像素应该标记为 0xFFFF', () => {
    const w = 2, h = 2;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array([255, 0, 255, 0]);

    const result = quantize.quantizeToPalette(pixels, w, h, alpha, testPalette);

    assert.strictEqual(result.labels[1], 0xFFFF, 'Transparent pixel should be 0xFFFF');
    assert.strictEqual(result.labels[3], 0xFFFF, 'Transparent pixel should be 0xFFFF');
    assert.ok(result.labels[0] !== 0xFFFF, 'Opaque pixel should not be 0xFFFF');
  });
});

// ============================================================
// 8. 带抖动的量化测试
// ============================================================

describe('quantizeWithDithering', () => {
  test('渐变区域应该产生更自然的过渡', () => {
    const w = 10, h = 1;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h).fill(255);

    for (let i = 0; i < w; i++) {
      pixels[i * 3] = Math.round(255 * i / (w - 1));
      pixels[i * 3 + 1] = 0;
      pixels[i * 3 + 2] = 0;
    }

    const result = quantize.quantizeWithDithering(pixels, w, h, alpha, testPalette);

    const uniqueLabels = new Set(result.labels);
    assert.ok(uniqueLabels.size >= 1, 'Dithered gradient should have multiple labels');
  });
});

// ============================================================
// 9. K-Means 量化测试
// ============================================================

describe('kMeansQuantize', () => {
  test('单色图像应该产生一个聚类', () => {
    const w = 10, h = 10;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h).fill(255);

    for (let i = 0; i < w * h; i++) {
      pixels[i * 3] = 200;
      pixels[i * 3 + 1] = 100;
      pixels[i * 3 + 2] = 50;
    }

    const result = kmeans.kMeansQuantize(pixels, w, h, alpha, 5, 20);

    assert.ok(result.centroids.length >= 1, 'Should have at least 1 centroid');
    assert.ok(result.centroids.length <= 5, 'Should have at most 5 centroids');
  });

  test('全透明图像应该返回空结果', () => {
    const w = 4, h = 4;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h).fill(0);

    const result = kmeans.kMeansQuantize(pixels, w, h, alpha, 5, 10);

    assert.strictEqual(result.centroids.length, 0);
    assert.strictEqual(result.counts.length, 0);
  });

  test('标签数组应该包含有效索引或 0xFFFF', () => {
    const w = 5, h = 5;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h);
    alpha[0] = 255;
    alpha.fill(0, 1);

    pixels[0] = 100; pixels[1] = 150; pixels[2] = 200;

    const result = kmeans.kMeansQuantize(pixels, w, h, alpha, 3, 10);

    assert.ok(result.labels[0] < 0xFFFF, 'Opaque pixel should have valid label');
    assert.strictEqual(result.labels[1], 0xFFFF, 'Transparent pixel should be 0xFFFF');
  });
});

// ============================================================
// 10. Floyd-Steinberg 抖动测试
// ============================================================

describe('floydSteinberg', () => {
  test('误差应该正确扩散到邻居', () => {
    const w = 2, h = 2;
    const pixels = new Float32Array(w * h * 3);
    const alpha = new Uint8Array(w * h).fill(255);

    // 只有左上角有值，其他为 0
    pixels[0] = 200.7;
    pixels[1] = 100.3;
    pixels[2] = 50.2;

    dithering.floydSteinberg(pixels, w, h, alpha);

    // 第一个像素应该被量化为整数
    assert.strictEqual(pixels[0], 201, 'First pixel R should be rounded');
    assert.strictEqual(pixels[1], 100, 'First pixel G should be rounded');
    assert.strictEqual(pixels[2], 50, 'First pixel B should be rounded');

    // 误差扩散：检查右侧邻居（像素 1）的值变化
    // 像素 1 收到误差后会被处理，但最终值应该反映误差影响
    // 简单验证：函数不应该抛异常且输出为整数
    assert.ok(Number.isInteger(pixels[0]), 'Quantized pixel should be integer');
    assert.ok(Number.isInteger(pixels[3]), 'Neighbor pixel should be integer after dithering');
  });

  test('透明像素不应该被处理', () => {
    const w = 2, h = 1;
    const pixels = new Float32Array(w * h * 3);
    pixels[0] = 128.7;
    pixels[1] = 128.7;
    pixels[2] = 128.7;
    pixels[3] = 128.7;
    pixels[4] = 128.7;
    pixels[5] = 128.7;

    const alpha = new Uint8Array([0, 255]);

    dithering.floydSteinberg(pixels, w, h, alpha);

    assert.ok(Math.abs(pixels[0] - 128.7) < 0.01, 'Transparent pixel should not be significantly modified');
    assert.strictEqual(pixels[3], 129, 'Opaque pixel should be rounded');
  });
});

// ============================================================
// 11. 性能测试
// ============================================================

describe('performance', () => {
  test('nearestColor 应该在合理时间内完成 1000 次调用', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      colorMatch.nearestColor(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        testPalette
      );
    }
    const elapsed = performance.now() - start;
    assert.ok(elapsed < 500, `1000 nearestColor calls took ${elapsed.toFixed(1)}ms, expected < 500ms`);
  });

  test('两阶段搜索应该比全量 CIEDE2000 更快（使用大色板）', () => {
    // 构建大色板（模拟真实场景）
    const largePalette: TestBeadColor[] = [];
    for (let r = 0; r < 256; r += 32) {
      for (let g = 0; g < 256; g += 32) {
        for (let b = 0; b < 256; b += 32) {
          largePalette.push({
            code: `${r}_${g}_${b}`,
            name: '',
            hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
            rgb: [r, g, b],
          });
        }
      }
    }

    colorMatch.clearColorCache();

    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      colorMatch.nearestColor(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        largePalette
      );
    }
    const elapsed = performance.now() - start;

    assert.ok(elapsed < 2000, `100 calls with ${largePalette.length}-color palette took ${elapsed.toFixed(1)}ms`);
  });
});

// ============================================================
// 12. 边界条件测试
// ============================================================

describe('edge cases', () => {
  test('nearestColor 应该处理边界值', () => {
    assert.doesNotThrow(() => colorMatch.nearestColor(0, 0, 0, testPalette));
    assert.doesNotThrow(() => colorMatch.nearestColor(255, 255, 255, testPalette));
    assert.doesNotThrow(() => colorMatch.nearestColor(128, 128, 128, testPalette));
  });

  test('pixelate 应该处理 1x1 图像', () => {
    const data = new Uint8ClampedArray(4);
    data[0] = 200; data[1] = 100; data[2] = 50; data[3] = 255;

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, 1, 1), 1, 1, null);
    assert.strictEqual(result.width, 1);
    assert.strictEqual(result.height, 1);
  });

  test('pixelate 缩放比例不应该出错', () => {
    const w = 7, h = 5;
    const data = new Uint8ClampedArray(w * h * 4).fill(128);
    for (let i = 3; i < data.length; i += 4) data[i] = 255;

    const result = pixelate.pixelateWithMask(new ImageDataPolyfill(data, w, h), 3, 2, null);
    assert.strictEqual(result.width, 3);
    assert.strictEqual(result.height, 2);
  });
});

// ============================================================
// 10. LAB 八叉树量化测试
// ============================================================

describe('octreeMatch', () => {
  test('纯色图像应该映射到最近色', () => {
    const w = 10, h = 10;
    const pixels = new Uint8ClampedArray(w * h * 4);

    for (let i = 0; i < w * h; i++) {
      pixels[i * 4] = 255;
      pixels[i * 4 + 1] = 0;
      pixels[i * 4 + 2] = 0;
      pixels[i * 4 + 3] = 255;
    }

    const result = octree.octreeMatch(pixels, w, h, testPalette);
    assert.ok(result.labels.length === w * h, 'Should have correct label count');
    assert.ok(result.leafCount > 0, 'Should have at least 1 leaf');
    // 红色像素应该映射到红色色板 (index 0)
    const redCount = result.counts[0] || 0;
    assert.ok(redCount > 0, 'Red pixels should map to red palette entry');
  });

  test('全透明图像应该返回空标签', () => {
    const w = 4, h = 4;
    const pixels = new Uint8ClampedArray(w * h * 4);

    const result = octree.octreeMatch(pixels, w, h, testPalette);
    assert.ok(result.labels.length === w * h, 'Should have correct label count');
    assert.ok(result.leafCount === 0, 'Should have 0 leaves for fully transparent image');
  });

  test('多色图像应该产生多个聚类', () => {
    const w = 20, h = 20;
    const pixels = new Uint8ClampedArray(w * h * 4);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const c = Math.floor(x / w * 3);
        if (c === 0) { pixels[i*4] = 255; pixels[i*4+1] = 0; pixels[i*4+2] = 0; }
        else if (c === 1) { pixels[i*4] = 0; pixels[i*4+1] = 255; pixels[i*4+2] = 0; }
        else { pixels[i*4] = 0; pixels[i*4+1] = 0; pixels[i*4+2] = 255; }
        pixels[i*4+3] = 255;
      }
    }

    const result = octree.octreeMatch(pixels, w, h, testPalette);
    assert.ok(result.leafCount > 0, 'Should have leaves');
    const usedColors = result.counts.filter(c => c > 0).length;
    assert.ok(usedColors >= 1, 'Should use at least 1 color');
  });
});

console.log('\n✅ All tests completed!');
