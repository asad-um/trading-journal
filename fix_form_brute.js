const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Looking for the `<Form {...form}>` stray token crash.
// Let's just find `const presets = getDynamicPresets();` and safely replace everything around it.

const regex = /const presets = getDynamicPresets\(\);\s*return \(\s*<Form \{\.\.\.form\}>/g;
if(regex.test(content)) {
    console.log("Found the normal block");
} else {
    // If it's mangled, we just pull the top lines 1-320
    const lines = content.split('\\n');
    let fixed = [];
    let insideForm = false;
    for(let i=0; i<lines.length; i++) {
        if(lines[i].includes('const presets = getDynamicPresets();')) {
            fixed.push('  const presets = getDynamicPresets();');
            fixed.push('  return (');
            fixed.push('    <Form {...form}>');
            fixed.push('      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-20 max-w-4xl mx-auto">');
            insideForm = true;
            // Skip next lines until we reach Section 1
            while(!lines[i].includes('{/* Section 1: Core Setup */}')) {
                i++;
            }
            fixed.push('        {/* Section 1: Core Setup */}');
        } else {
            if(!insideForm) fixed.push(lines[i]);
            else fixed.push(lines[i]);
        }
    }
    fs.writeFileSync('src/components/trades/trade-form.tsx', fixed.join('\\n'));
}

