import os

filepath = r'c:\Users\HP ELITEBOOK\Downloads\PME\frontend\src\App.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_btn = -1
end_btn = -1
for i, line in enumerate(lines):
    if '<button' in line and i+1 < len(lines) and "setActiveSection('eda')" in lines[i+1]:
        start_btn = i
    if start_btn != -1 and end_btn == -1 and '</button>' in line:
        end_btn = i

start_eda = -1
for i, line in enumerate(lines):
    if '{/* SECTION 6: EXPLORATORY DATA ANALYSIS (EDA) */}' in line:
        start_eda = i - 1
        break

end_eda = -1
if start_eda != -1:
    for i in range(start_eda, len(lines)):
        if '<Footer />' in lines[i]:
            end_eda = i - 1
            break

print(f'Button: {start_btn} to {end_btn}')
print(f'EDA: {start_eda} to {end_eda}')

if start_btn != -1 and start_eda != -1 and end_eda > start_eda:
    new_lines = lines[:start_btn] + lines[end_btn+1:start_eda] + lines[end_eda+1:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print('Removed successfully.')
else:
    print('Indices not found or invalid')
