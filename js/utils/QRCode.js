/**
 * @fileoverview Gerador Autónomo de QR Code (Zero Dependências)
 * Baseado no algoritmo padrão ISO/IEC 18004 (Model 2).
 */

export class QRCode {
    /**
     * Gera uma matriz de dados QR para um texto/URL.
     * @param {string} text - URL ou texto a codificar.
     * @param {number} [errorCorrectionLevel=0] - Nível de correção de erro (0=M, 1=L, 2=H, 3=Q).
     * @returns {any} Objeto QR Code interno com métodos de desenho.
     */
    static create(text, errorCorrectionLevel = 0) {
        const PAD0 = 0xec;
        const PAD1 = 0x11;

        let _typeNumber = 0;
        let _errorCorrectionLevel = errorCorrectionLevel;
        let _modules = null;
        let _moduleCount = 0;
        let _dataCache = null;
        const _dataList = [new QR8bitByte(text)];

        const qr = {};

        qr.isDark = function (row, col) {
            if (row < 0 || _moduleCount <= row || col < 0 || _moduleCount <= col) {
                return false;
            }
            return _modules[row][col];
        };

        qr.getModuleCount = function () {
            return _moduleCount;
        };

        qr.make = function () {
            let typeNumber = 1;
            for (typeNumber = 1; typeNumber < 40; typeNumber++) {
                const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, _errorCorrectionLevel);
                const buffer = new QRBitBuffer();
                let totalDataCount = 0;
                for (let i = 0; i < rsBlocks.length; i++) {
                    totalDataCount += rsBlocks[i].dataCount;
                }
                for (let i = 0; i < _dataList.length; i++) {
                    const data = _dataList[i];
                    buffer.put(data.mode, 4);
                    buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                    data.write(buffer);
                }
                if (buffer.getLengthInBits() <= totalDataCount * 8) break;
            }
            _typeNumber = typeNumber;
            makeImpl(false, getBestMaskPattern());
        };

        function makeImpl(test, maskPattern) {
            _moduleCount = _typeNumber * 4 + 17;
            _modules = new Array(_moduleCount);
            for (let row = 0; row < _moduleCount; row++) {
                _modules[row] = new Array(_moduleCount);
                for (let col = 0; col < _moduleCount; col++) {
                    _modules[row][col] = null;
                }
            }
            setupPositionProbePattern(0, 0);
            setupPositionProbePattern(_moduleCount - 7, 0);
            setupPositionProbePattern(0, _moduleCount - 7);
            setupPositionAdjustPattern();
            setupTimingPattern();
            setupTypeInfo(test, maskPattern);
            if (_typeNumber >= 7) setupTypeNumber(test);
            if (_dataCache == null) _dataCache = createData(_typeNumber, _errorCorrectionLevel, _dataList);
            mapData(_dataCache, maskPattern);
        }

        function setupPositionProbePattern(row, col) {
            for (let r = -1; r <= 7; r++) {
                if (row + r <= -1 || _moduleCount <= row + r) continue;
                for (let c = -1; c <= 7; c++) {
                    if (col + c <= -1 || _moduleCount <= col + c) continue;
                    if (
                        (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
                        (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
                        (2 <= r && r <= 4 && 2 <= c && c <= 4)
                    ) {
                        _modules[row + r][col + c] = true;
                    } else {
                        _modules[row + r][col + c] = false;
                    }
                }
            }
        }

        function getBestMaskPattern() {
            let minLostPoint = 0;
            let pattern = 0;
            for (let i = 0; i < 8; i++) {
                makeImpl(true, i);
                const lostPoint = QRUtil.getLostPoint(qr);
                if (i === 0 || minLostPoint > lostPoint) {
                    minLostPoint = lostPoint;
                    pattern = i;
                }
            }
            return pattern;
        }

        function setupTimingPattern() {
            for (let r = 8; r < _moduleCount - 8; r++) {
                if (_modules[r][6] != null) continue;
                _modules[r][6] = r % 2 === 0;
            }
            for (let c = 8; c < _moduleCount - 8; c++) {
                if (_modules[6][c] != null) continue;
                _modules[6][c] = c % 2 === 0;
            }
        }

        function setupPositionAdjustPattern() {
            const pos = QRUtil.getPatternPosition(_typeNumber);
            for (let i = 0; i < pos.length; i++) {
                for (let j = 0; j < pos.length; j++) {
                    const row = pos[i];
                    const col = pos[j];
                    if (_modules[row][col] != null) continue;
                    for (let r = -2; r <= 2; r++) {
                        for (let c = -2; c <= 2; c++) {
                            if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0)) {
                                _modules[row + r][col + c] = true;
                            } else {
                                _modules[row + r][col + c] = false;
                            }
                        }
                    }
                }
            }
        }

        function setupTypeNumber(test) {
            const bits = QRUtil.getBCHTypeNumber(_typeNumber);
            for (let i = 0; i < 18; i++) {
                const mod = !test && ((bits >> i) & 1) === 1;
                _modules[Math.floor(i / 3)][(i % 3) + _moduleCount - 8 - 3] = mod;
            }
            for (let i = 0; i < 18; i++) {
                const mod = !test && ((bits >> i) & 1) === 1;
                _modules[(i % 3) + _moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
            }
        }

        function setupTypeInfo(test, maskPattern) {
            const data = (_errorCorrectionLevel << 3) | maskPattern;
            const bits = QRUtil.getBCHTypeInfo(data);
            for (let i = 0; i < 15; i++) {
                const mod = !test && ((bits >> i) & 1) === 1;
                if (i < 6) _modules[i][8] = mod;
                else if (i < 8) _modules[i + 1][8] = mod;
                else _modules[_moduleCount - 15 + i][8] = mod;
            }
            for (let i = 0; i < 15; i++) {
                const mod = !test && ((bits >> i) & 1) === 1;
                if (i < 8) _modules[8][_moduleCount - i - 1] = mod;
                else if (i < 9) _modules[8][15 - i - 1 + 1] = mod;
                else _modules[8][15 - i - 1] = mod;
            }
            _modules[_moduleCount - 8][8] = !test;
        }

        function mapData(data, maskPattern) {
            let inc = -1;
            let row = _moduleCount - 1;
            let bitIndex = 7;
            let byteIndex = 0;
            const maskFunc = QRUtil.getMaskFunction(maskPattern);
            for (let col = _moduleCount - 1; col > 0; col -= 2) {
                if (col === 6) col--;
                while (true) {
                    for (let c = 0; c < 2; c++) {
                        if (_modules[row][col - c] == null) {
                            let dark = false;
                            if (byteIndex < data.length) {
                                dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
                            }
                            const mask = maskFunc(row, col - c);
                            if (mask) dark = !dark;
                            _modules[row][col - c] = dark;
                            bitIndex--;
                            if (bitIndex === -1) {
                                byteIndex++;
                                bitIndex = 7;
                            }
                        }
                    }
                    row += inc;
                    if (row < 0 || _moduleCount <= row) {
                        row -= inc;
                        inc = -inc;
                        break;
                    }
                }
            }
        }

        function createData(typeNumber, errorCorrectionLevel, dataList) {
            const rsBlocks = QRRSBlock.getRSBlocks(typeNumber, errorCorrectionLevel);
            const buffer = new QRBitBuffer();
            for (let i = 0; i < dataList.length; i++) {
                const data = dataList[i];
                buffer.put(data.mode, 4);
                buffer.put(data.getLength(), QRUtil.getLengthInBits(data.mode, typeNumber));
                data.write(buffer);
            }
            let totalDataCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) {
                totalDataCount += rsBlocks[i].dataCount;
            }
            if (buffer.getLengthInBits() > totalDataCount * 8) {
                throw new Error('QR overflow (' + buffer.getLengthInBits() + ' > ' + totalDataCount * 8 + ')');
            }
            if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
            while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
            while (true) {
                if (buffer.getLengthInBits() >= totalDataCount * 8) break;
                buffer.put(PAD0, 8);
                if (buffer.getLengthInBits() >= totalDataCount * 8) break;
                buffer.put(PAD1, 8);
            }
            return createBytes(buffer, rsBlocks);
        }

        function createBytes(buffer, rsBlocks) {
            let offset = 0;
            let maxDcCount = 0;
            let maxEcCount = 0;
            const dcdata = new Array(rsBlocks.length);
            const ecdata = new Array(rsBlocks.length);
            for (let r = 0; r < rsBlocks.length; r++) {
                const dcCount = rsBlocks[r].dataCount;
                const ecCount = rsBlocks[r].totalCount - dcCount;
                maxDcCount = Math.max(maxDcCount, dcCount);
                maxEcCount = Math.max(maxEcCount, ecCount);
                dcdata[r] = new Array(dcCount);
                for (let i = 0; i < dcdata[r].length; i++) {
                    dcdata[r][i] = 0xff & buffer.buffer[i + offset];
                }
                offset += dcCount;
                const rsPoly = QRUtil.getErrorCorrectPolynomial(ecCount);
                const rawPoly = new QRPolynomial(dcdata[r], rsPoly.getLength() - 1);
                const modPoly = rawPoly.mod(rsPoly);
                ecdata[r] = new Array(rsPoly.getLength() - 1);
                for (let i = 0; i < ecdata[r].length; i++) {
                    const modIndex = i + modPoly.getLength() - ecdata[r].length;
                    ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
                }
            }
            let totalCodeCount = 0;
            for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
            const data = new Array(totalCodeCount);
            let index = 0;
            for (let i = 0; i < maxDcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < dcdata[r].length) data[index++] = dcdata[r][i];
                }
            }
            for (let i = 0; i < maxEcCount; i++) {
                for (let r = 0; r < rsBlocks.length; r++) {
                    if (i < ecdata[r].length) data[index++] = ecdata[r][i];
                }
            }
            return data;
        }

        qr.make();
        return qr;
    }

    /**
     * Gera um elemento SVG contendo o QR Code.
     * @param {string} text - URL ou texto.
     * @param {number} [cellSize=6] - Tamanho de cada módulo em píxeis.
     * @param {number} [margin=4] - Margem externa em módulos.
     * @returns {string} String com código SVG válido.
     */
    static generateSvg(text, cellSize = 6, margin = 3) {
        const qr = QRCode.create(text);
        const count = qr.getModuleCount();
        const size = (count + margin * 2) * cellSize;

        let pathD = '';
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (qr.isDark(r, c)) {
                    const x = (c + margin) * cellSize;
                    const y = (r + margin) * cellSize;
                    pathD += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
                }
            }
        }

        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" class="w-full h-full">
            <rect width="${size}" height="${size}" fill="#ffffff" rx="12" />
            <path fill="#0f172a" d="${pathD}" />
        </svg>`;
    }

    /**
     * Desenha o QR Code num elemento HTMLCanvasElement em alta definição.
     * @param {HTMLCanvasElement} canvas - Elemento canvas onde desenhar.
     * @param {string} text - URL ou texto.
     * @param {number} [targetSize=600] - Resolução desejada em píxeis (quadrado).
     * @returns {void}
     */
    static renderToCanvas(canvas, text, targetSize = 600) {
        const qr = QRCode.create(text);
        const count = qr.getModuleCount();
        const marginModules = 4;
        const totalModules = count + marginModules * 2;
        const cellSize = targetSize / totalModules;

        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Fundo branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetSize, targetSize);

        // Módulos escuros
        ctx.fillStyle = '#0f172a';
        for (let r = 0; r < count; r++) {
            for (let c = 0; c < count; c++) {
                if (qr.isDark(r, c)) {
                    const x = Math.round((c + marginModules) * cellSize);
                    const y = Math.round((r + marginModules) * cellSize);
                    const w = Math.ceil(cellSize);
                    const h = Math.ceil(cellSize);
                    ctx.fillRect(x, y, w, h);
                }
            }
        }
    }
}

// 8bit Byte
function QR8bitByte(data) {
    this.mode = 4;
    this.data = data;
}
QR8bitByte.prototype = {
    getLength: function () {
        return this.data.length;
    },
    write: function (buffer) {
        for (let i = 0; i < this.data.length; i++) {
            buffer.put(this.data.charCodeAt(i), 8);
        }
    }
};

// Polynomial
function QRPolynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    this.num = new Array(num.length - offset + shift);
    for (let i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
    for (let i = num.length - offset; i < this.num.length; i++) this.num[i] = 0;
}
QRPolynomial.prototype = {
    get: function (index) {
        return this.num[index];
    },
    getLength: function () {
        return this.num.length;
    },
    multiply: function (e) {
        const num = new Array(this.getLength() + e.getLength() - 1);
        for (let i = 0; i < this.getLength(); i++) {
            for (let j = 0; j < e.getLength(); j++) {
                num[i + j] ^= QRMath.gmult(this.get(i), e.get(j));
            }
        }
        return new QRPolynomial(num, 0);
    },
    mod: function (e) {
        if (this.getLength() - e.getLength() < 0) return this;
        const ratio = QRMath.glog(this.get(0)) - QRMath.glog(e.get(0));
        const num = new Array(this.getLength());
        for (let i = 0; i < this.getLength(); i++) num[i] = this.get(i);
        for (let i = 0; i < e.getLength(); i++) {
            num[i] ^= QRMath.gmult(e.get(i), QRMath.gexp(ratio));
        }
        return new QRPolynomial(num, 0).mod(e);
    }
};

const QRMath = {
    glog: function (n) {
        if (n < 1) throw new Error('glog(' + n + ')');
        return QRMath.LOG_TABLE[n];
    },
    gexp: function (n) {
        while (n < 0) n += 255;
        while (n >= 256) n -= 255;
        return QRMath.EXP_TABLE[n];
    },
    gmult: function (a, b) {
        if (a === 0 || b === 0) return 0;
        return QRMath.gexp(QRMath.glog(a) + QRMath.glog(b));
    },
    EXP_TABLE: new Array(256),
    LOG_TABLE: new Array(256)
};
for (let i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (let i = 8; i < 256; i++) {
    QRMath.EXP_TABLE[i] =
        QRMath.EXP_TABLE[i - 4] ^
        QRMath.EXP_TABLE[i - 5] ^
        QRMath.EXP_TABLE[i - 6] ^
        QRMath.EXP_TABLE[i - 8];
}
for (let i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;

const QRRSBlock = {
    RS_BLOCK_TABLE: [
        [1, 26, 19], [1, 26, 16], [1, 26, 13], [1, 26, 9],
        [1, 44, 34], [1, 44, 28], [1, 44, 22], [1, 44, 16],
        [1, 70, 55], [1, 70, 44], [2, 35, 17], [2, 35, 13],
        [1, 100, 80], [2, 50, 32], [2, 50, 24], [4, 25, 9],
        [1, 134, 108], [2, 67, 43], [2, 33, 15, 2, 34, 16], [2, 33, 11, 2, 34, 12],
        [2, 86, 68], [4, 43, 27], [4, 43, 19], [4, 43, 15],
        [2, 98, 78], [4, 49, 31], [2, 32, 14, 4, 33, 15], [4, 39, 13, 1, 40, 14],
        [2, 121, 97], [2, 60, 38, 2, 61, 39], [4, 40, 18, 2, 41, 19], [4, 40, 14, 2, 41, 15],
        [2, 146, 116], [3, 58, 36, 2, 59, 37], [4, 36, 16, 4, 37, 17], [4, 36, 12, 4, 37, 13],
        [2, 86, 68, 2, 87, 69], [4, 69, 43, 1, 70, 44], [6, 43, 19, 2, 44, 20], [6, 43, 15, 2, 44, 16]
    ],
    getRSBlocks: function (typeNumber, errorCorrectionLevel) {
        const rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectionLevel);
        if (!rsBlock) throw new Error('bad rs block: ' + typeNumber);
        const length = rsBlock.length / 3;
        const list = [];
        for (let i = 0; i < length; i++) {
            const count = rsBlock[i * 3 + 0];
            const totalCount = rsBlock[i * 3 + 1];
            const dataCount = rsBlock[i * 3 + 2];
            for (let j = 0; j < count; j++) {
                list.push({ totalCount, dataCount });
            }
        }
        return list;
    },
    getRsBlockTable: function (typeNumber, errorCorrectionLevel) {
        switch (errorCorrectionLevel) {
            case 1: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
            case 0: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
            case 3: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
            case 2: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
            default: return undefined;
        }
    }
};

function QRBitBuffer() {
    this.buffer = [];
    this.length = 0;
}
QRBitBuffer.prototype = {
    get: function (index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - (index % 8))) & 1) === 1;
    },
    put: function (num, length) {
        for (let i = 0; i < length; i++) {
            this.putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
    },
    getLengthInBits: function () {
        return this.length;
    },
    putBit: function (bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) this.buffer.push(0);
        if (bit) this.buffer[bufIndex] |= 0x80 >>> (this.length % 8);
        this.length++;
    }
};

const QRUtil = {
    PATTERN_POSITION_TABLE: [
        [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
        [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54]
    ],
    getPatternPosition: function (typeNumber) {
        return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1] || [];
    },
    getMaskFunction: function (maskPattern) {
        switch (maskPattern) {
            case 0: return (i, j) => (i + j) % 2 === 0;
            case 1: return (i, j) => i % 2 === 0;
            case 2: return (i, j) => j % 3 === 0;
            case 3: return (i, j) => (i + j) % 3 === 0;
            case 4: return (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
            case 5: return (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0;
            case 6: return (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
            case 7: return (i, j) => (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
            default: throw new Error('bad maskPattern:' + maskPattern);
        }
    },
    getErrorCorrectPolynomial: function (errorCorrectLength) {
        let a = new QRPolynomial([1], 0);
        for (let i = 0; i < errorCorrectLength; i++) {
            a = a.multiply(new QRPolynomial([1, QRMath.gexp(i)], 0));
        }
        return a;
    },
    getLengthInBits: function (mode, type) {
        if (1 <= type && type < 10) {
            switch (mode) {
                case 1: return 10;
                case 2: return 9;
                case 4: return 8;
                case 8: return 8;
                default: throw new Error('mode:' + mode);
            }
        } else if (type < 27) {
            switch (mode) {
                case 1: return 12;
                case 2: return 11;
                case 4: return 16;
                case 8: return 10;
                default: throw new Error('mode:' + mode);
            }
        } else {
            switch (mode) {
                case 1: return 14;
                case 2: return 13;
                case 4: return 16;
                case 8: return 12;
                default: throw new Error('mode:' + mode);
            }
        }
    },
    getLostPoint: function (qrCode) {
        const moduleCount = qrCode.getModuleCount();
        let lostPoint = 0;
        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                let sameCount = 0;
                const dark = qrCode.isDark(row, col);
                for (let r = -1; r <= 1; r++) {
                    if (row + r < 0 || moduleCount <= row + r) continue;
                    for (let c = -1; c <= 1; c++) {
                        if (col + c < 0 || moduleCount <= col + c) continue;
                        if (r === 0 && c === 0) continue;
                        if (dark === qrCode.isDark(row + r, col + c)) sameCount++;
                    }
                }
                if (sameCount > 5) lostPoint += 3 + sameCount - 5;
            }
        }
        return lostPoint;
    },
    getBCHTypeInfo: function (data) {
        let d = data << 10;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335) >= 0) {
            d ^= 1335 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(1335));
        }
        return ((data << 10) | d) ^ 21522;
    },
    getBCHTypeNumber: function (data) {
        let d = data << 12;
        while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973) >= 0) {
            d ^= 7973 << (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(7973));
        }
        return (data << 12) | d;
    },
    getBCHDigit: function (data) {
        let digit = 0;
        while (data !== 0) {
            digit++;
            data >>>= 1;
        }
        return digit;
    }
};

