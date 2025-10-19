/**
 * Editor Controls
 * Handles UI controls for the shape editor
 */

export class EditorControls {
    constructor(params, onParamChange) {
        this.params = params;
        this.onParamChange = onParamChange;
        this.setupInputs();
    }

    setupInputs() {
        const inputs = [
            'numSegments', 'bodyWidth', 'bodyHeight',
            'bodyTaperStart', 'bodyTaperStrength', 'bodyPeakPosition', 'bodyPeakWidth', 'bodyFrontWidth', 'bodyAsymmetry',
            'headX', 'headWidth', 'headHeight',
            'eyeX', 'eyeYTop', 'eyeYBottom', 'eyeSize',
            'tailStartX', 'tailWidthStart', 'tailWidthEnd', 'tailSplit',
            'dorsalPos', 'dorsalY',
            'pectoralPos', 'pectoralYTop', 'pectoralAngleTop', 'pectoralYBottom', 'pectoralAngleBottom',
            'ventralPos', 'ventralYTop', 'ventralAngleTop', 'ventralYBottom', 'ventralAngleBottom'
        ];

        inputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', (e) => {
                    this.params[id] = parseFloat(e.target.value);
                    this.updateOutput();
                    if (this.onParamChange) {
                        this.onParamChange(id, this.params[id]);
                    }
                });
            }
        });

        // Copy values button
        const copyButton = document.getElementById('copyValues');
        if (copyButton) {
            copyButton.addEventListener('click', () => {
                const output = document.getElementById('output').textContent;
                navigator.clipboard.writeText(output);
                alert('Values copied to clipboard!');
            });
        }
    }

    updateOutput() {
        const output = `// Koi Shape Parameters
numSegments: ${this.params.numSegments}
bodyWidth: ${this.params.bodyWidth.toFixed(2)}
bodyHeight: ${this.params.bodyHeight.toFixed(2)}
bodyTaperStart: ${this.params.bodyTaperStart.toFixed(2)}
bodyTaperStrength: ${this.params.bodyTaperStrength.toFixed(2)}
bodyPeakPosition: ${this.params.bodyPeakPosition.toFixed(2)}
bodyPeakWidth: ${this.params.bodyPeakWidth.toFixed(1)}
bodyFrontWidth: ${this.params.bodyFrontWidth.toFixed(1)}
bodyAsymmetry: ${this.params.bodyAsymmetry.toFixed(2)}

// Head
headX: ${this.params.headX.toFixed(1)}
headWidth: ${this.params.headWidth.toFixed(1)}
headHeight: ${this.params.headHeight.toFixed(1)}
eyeX: ${this.params.eyeX.toFixed(1)}
eyeYTop: ${this.params.eyeYTop.toFixed(1)}
eyeYBottom: ${this.params.eyeYBottom.toFixed(1)}
eyeSize: ${this.params.eyeSize.toFixed(1)}

// Tail
tailStartX: ${this.params.tailStartX.toFixed(1)}
tailWidthStart: ${this.params.tailWidthStart.toFixed(2)}
tailWidthEnd: ${this.params.tailWidthEnd.toFixed(2)}
tailSplit: ${this.params.tailSplit.toFixed(1)}

// Fins
dorsalPos: ${this.params.dorsalPos}
dorsalY: ${this.params.dorsalY.toFixed(1)}
pectoralPos: ${this.params.pectoralPos}
pectoralYTop: ${this.params.pectoralYTop.toFixed(1)}
pectoralAngleTop: ${this.params.pectoralAngleTop.toFixed(2)}
pectoralYBottom: ${this.params.pectoralYBottom.toFixed(1)}
pectoralAngleBottom: ${this.params.pectoralAngleBottom.toFixed(2)}
ventralPos: ${this.params.ventralPos}
ventralYTop: ${this.params.ventralYTop.toFixed(1)}
ventralAngleTop: ${this.params.ventralAngleTop.toFixed(2)}
ventralYBottom: ${this.params.ventralYBottom.toFixed(1)}
ventralAngleBottom: ${this.params.ventralAngleBottom.toFixed(2)}`;

        const outputElement = document.getElementById('output');
        if (outputElement) {
            outputElement.textContent = output;
        }
    }

    updateInputValue(paramName, value) {
        const element = document.getElementById(paramName);
        if (element) {
            element.value = value.toFixed(1);
        }
    }
}
