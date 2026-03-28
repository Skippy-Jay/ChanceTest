# 🎲 Chance — Step-by-Step Setup Guide

## THE UTF-16 BUG (why npm keeps failing)

Your VS Code is saving files as **UTF-16 LE** (visible in the bottom-right 
status bar). npm requires **UTF-8**. This is why you keep seeing:

```
npm error JSON.parse Unexpected token "�" (0xFFFD)
```

The `0xFFFD` IS the UTF-16 byte-order mark that npm can't read.
This guide includes a fix.

---

## STEP 1: Fix VS Code Default Encoding (DO THIS FIRST)

1. Open VS Code
2. Press `Ctrl + Shift + P` (Command Palette)
3. Type: `Preferences: Open User Settings (JSON)`
4. Press Enter
5. Add this line inside the `{}` braces:

```json
"files.encoding": "utf8"
```

So it looks something like:
```json
{
    "files.encoding": "utf8",
    ... your other settings ...
}
```

6. **Save and close** the settings file.

This permanently prevents VS Code from creating UTF-16 files.

---

## STEP 2: Delete EVERYTHING from the old project

1. Close VS Code completely
2. Open File Explorer
3. Go to `C:\Users\markk\`
4. DELETE the entire `chance-web` folder (right-click → Delete)
5. Empty your Recycle Bin (to be safe)

---

## STEP 3: Extract the new project

1. Download `chance-web-v2.zip` from this conversation
2. Right-click the zip → **Extract All...**
3. Extract to: `C:\Users\markk\`
4. You should now have: `C:\Users\markk\chance-web-v2\`

---

## STEP 4: Run the setup script

1. Open File Explorer to `C:\Users\markk\chance-web-v2\`
2. **Double-click `SETUP.bat`**
3. This will:
   - Force package.json to UTF-8 (nuclear option)
   - Delete any old node_modules
   - Run `npm install`
   - Verify the encoding is clean

You should see green text saying "package.json encoding: UTF-8 CLEAN"
and npm install completing without errors.

---

## STEP 5: Supabase Database

1. Go to: https://supabase.com/dashboard
2. Open your **Chancebaseapp** project
3. Click **SQL Editor** (left sidebar)
4. Click **+ New Query**
5. Open the file `supabase-schema-CLEAN.sql` in a text editor (Notepad)
6. Select All (Ctrl+A), Copy (Ctrl+C)
7. Paste into the Supabase SQL Editor
8. Click **Run**
9. You should see: **"Success. No rows returned."**

This drops all the old broken tables and creates fresh ones.
Your existing `urls` data is preserved.

---

## STEP 6: Add your Supabase keys

1. Open VS Code
2. Open folder: `C:\Users\markk\chance-web-v2\`
3. Open the file `.env.local`
4. **IMPORTANT**: Look at the bottom-right of VS Code — it should say **UTF-8**
   - If it says UTF-16 LE, click on it and select "Reopen with Encoding" → UTF-8
5. Replace the placeholder keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://mvsbxyopyzfgevezqlht.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=paste_your_real_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=paste_your_real_service_role_key_here
```

6. Save (Ctrl+S)

---

## STEP 7: Run the app

1. In VS Code, open the Terminal (`Ctrl + ~`)
2. Make sure you're in the right folder:
   ```
   cd C:\Users\markk\chance-web-v2
   ```
3. Run:
   ```
   npm run dev
   ```
4. You should see:
   ```
   ▲ Next.js 14.x.x
   - Local: http://localhost:3000
   ```
5. Open your browser to **http://localhost:3000**

---

## STEP 8: Add URLs

1. Go to **http://localhost:3000/admin**
2. Use the **Bulk Import** tab
3. Paste URLs, one per line
4. Click Import

---

## IF NPM INSTALL STILL FAILS

The nuclear option — run this in PowerShell (not CMD):

```powershell
cd C:\Users\markk\chance-web-v2

# Force-rewrite package.json as UTF-8
$content = Get-Content package.json -Raw
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText("$pwd\package.json", $content, $utf8)

# Verify
$bytes = [System.IO.File]::ReadAllBytes("$pwd\package.json")
Write-Host "First byte: $($bytes[0]) (should be 123, which is '{')"

# Clean and install
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install
```

The first byte should be **123** (the `{` character in UTF-8).
If it's 255 or 254, the file is still UTF-16 and something is 
re-encoding it — check your VS Code settings from Step 1.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `0xFFFD` / EJSONPARSE | Encoding issue. Run SETUP.bat again. |
| "Missing Supabase environment variables" | Check .env.local has your keys (no quotes around values) |
| "No URLs found" | Go to /admin and add some URLs |
| Supabase "column does not exist" | Run supabase-schema-CLEAN.sql (it drops old tables) |
| VS Code shows UTF-16 LE | Click it → "Save with Encoding" → UTF-8 |
