const fs = require('fs');
const filePath = '/Users/jinsiyajasmin/Desktop/iauditApp/company-creator-hub/src/pages/ExecuteAuditTemplate.tsx';
let content = fs.readFileSync(filePath, 'utf-8');

const strToFind = '{/* --- NEW EXTENDED SECTIONS --- */}';
const targetStartStr = '{(template.content as ClauseChecklistContent[]).map((clause, index) => {';

let lines = content.split('\n');
const startIdx = lines.findIndex(l => l.includes(strToFind));

if (startIdx !== -1) {
    let endIdx = -1;
    let divCount = 0;
    let started = false;
    for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('<div')) {
            started = true;
            divCount += (line.match(/<div/g) || []).length;
        }
        if (line.includes('</div')) {
            divCount -= (line.match(/<\/div/g) || []).length;
        }
        if (started && divCount === 0) {
            endIdx = i;
            break;
        }
    }

    if (endIdx !== -1) {
        // extract and adjust block
        let blockToMove = lines.slice(startIdx, endIdx + 1);
        blockToMove = blockToMove.map(line => {
            if (line.includes('space-y-8 mt-12 bg-white')) {
                return line.replace('mt-12', 'mb-12');
            }
            return line;
        });

        // remove block
        lines.splice(startIdx, endIdx - startIdx + 1);

        // find insert index again on the new lines array
        const insertIdx = lines.findIndex(l => l.includes(targetStartStr));
        if (insertIdx !== -1) {
            lines.splice(insertIdx, 0, ...blockToMove);
            fs.writeFileSync(filePath, lines.join('\n'));
            console.log('Script completed successfully.');
        } else {
            console.error('Error: Insert index not found.');
        }
    } else {
        console.error('Error: End of block not found.');
    }
} else {
    console.error('Error: Start of block not found.');
}
