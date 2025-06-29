import fs from 'fs';
import path from 'path';
import { Jimp } from 'jimp';
import { Delaunay } from 'd3-delaunay';

const neighborOffsets = [
    [-1, -1], [0, -1], [1, -1],
    [1, 0], [1, 1], [0, 1],
    [-1, 1], [-1, 0]
];

export async function fixPixels(filePath, { experimentalMode }) {
    if (!fs.existsSync(filePath)) {
        throw new Error('File not found: ' + filePath)
    }

    const fileName = path.basename(filePath)

    // TODO: Image processing...
    let output;
    if (experimentalMode) {
        output = await processImageWithUpscale(fileName, filePath)
    } else {
        output = await processImage(fileName, filePath)
    }
    if (output.startsWith('No transparent pixels')) {
        return output;
    }

    return `Processed ${fileName} and saved to ${output}.`;
}

async function processImage(fileName, filePath) {
    const image = await Jimp.read(filePath);

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = image.bitmap.data;

    let voronoiPoints = [];
    let voronoiColors = [];

    image.scan(0, 0, width, height, function (x, y, idx) {
        const alpha = data[idx + 3];
        if (alpha !== 0) {
            for (const [dx, dy] of neighborOffsets) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

                const nIdx = image.getPixelIndex(nx, ny);
                if (data[nIdx + 3] === 0) {
                    voronoiPoints.push([x, y]);
                    voronoiColors.push([
                        data[idx],
                        data[idx + 1],
                        data[idx + 2]
                    ]);
                    break;
                }
            }
        }
    });

    if (voronoiPoints.length === 0) {
        return `No transparent pixels to fix in ${fileName}`;
    }

    const delaunay = Delaunay.from(voronoiPoints);

    image.scan(0, 0, width, height, function (x, y, idx) {
        const alpha = data[idx + 3];
        if (alpha === 0) {
            const nearest = delaunay.find(x, y);
            const [r, g, b] = voronoiColors[nearest];

            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;

            data[idx + 3] = 0;
        }
    });

    const outputPath = filePath.replace(/(\.\w+)$/, '_fixed$1');
    await image.write(outputPath);
    console.log('done');
    return outputPath;
}

async function processImageWithUpscale(fileName, filePath) {
    const image = await Jimp.read(filePath);

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = image.bitmap.data;

    const scale = 0.25;
    const smallWidth = Math.max(1, Math.floor(width * scale));
    const smallHeight = Math.max(1, Math.floor(height * scale));

    const smallImage = image.clone().resize({ w: smallWidth, h: smallHeight });
    const smallData = smallImage.bitmap.data;

    let voronoiPoints = [];
    let voronoiColors = [];

    smallImage.scan(0, 0, smallWidth, smallHeight, function (x, y, idx) {
        const alpha = smallData[idx + 3];
        if (alpha !== 0) {
            for (const [dx, dy] of neighborOffsets) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= smallWidth || ny >= smallHeight) continue;

                const nIdx = smallImage.getPixelIndex(nx, ny);
                if (smallData[nIdx + 3] === 0) {
                    voronoiPoints.push([x, y]);
                    voronoiColors.push([
                        smallData[idx],
                        smallData[idx + 1],
                        smallData[idx + 2]
                    ]);
                    break;
                }
            }
        }
    });

    if (voronoiPoints.length === 0) {
        return `No transparent pixels to fix in ${fileName}`;
    }

    const delaunay = Delaunay.from(voronoiPoints);

    smallImage.scan(0, 0, smallWidth, smallHeight, function (x, y, idx) {
        const alpha = smallData[idx + 3];
        if (alpha === 0) {
            const nearest = delaunay.find(x, y);
            const [r, g, b] = voronoiColors[nearest];

            smallData[idx] = r;
            smallData[idx + 1] = g;
            smallData[idx + 2] = b;
            smallData[idx + 3] = 0;
        }
    });

    const fixedUpscaled = smallImage.clone().resize({ w: width, h: height });
    const fixedData = fixedUpscaled.bitmap.data;

    image.scan(0, 0, width, height, function (x, y, idx) {
        const alpha = data[idx + 3];
        if (alpha === 0) {
            data[idx] = fixedData[idx];
            data[idx + 1] = fixedData[idx + 1];
            data[idx + 2] = fixedData[idx + 2];
            data[idx + 3] = 0;
        }
    });

    const outputPath = filePath.replace(/(\.\w+)$/, '_fixed-experimental$1');
    await image.write(outputPath);
    console.log('done');
    return outputPath;
}