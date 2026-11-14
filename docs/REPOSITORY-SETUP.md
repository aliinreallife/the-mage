# GitHub onboarding

Recommended repository: `aliinreallife/the-mage`, **Private** initially, default branch `main`. The source archive contains research and unpublished game code. Visibility can be changed later when reviewed.

## Create the empty GitHub repo

1. Open https://github.com/new
2. Set **Owner** to the personal account you intend to use and **Repository name** to `the-mage`.
3. Choose **Private**.
4. Do **not** initialize with a README, `.gitignore`, or license (all project files are already prepared).
5. Create the repository.

## Push the prepared Git repository (easiest)

Download `The_Mage_Git_Ready.zip` and extract it. It contains the full project **and** a prepared `.git` repository with a single initial commit on `main`.

Open PowerShell, a terminal, or Git Bash inside the extracted `the-mage` folder, then run:

```bash
git status
git remote add origin https://github.com/aliinreallife/the-mage.git
git push -u origin main
```

Use your own GitHub authentication when prompted (Git Credential Manager or SSH). Do not paste credentials into ChatGPT.

**Alternative:** If your ZIP extractor removed `.git`, initialize Git in the folder first:

```bash
git init -b main
git add .
git commit -m "chore: import The Mage from Arena"
git remote add origin https://github.com/aliinreallife/the-mage.git
git push -u origin main
```

You can also use GitHub Desktop's **Add Existing Repository / Publish Repository** workflow, choosing Private, instead of the command line. The `The_Mage_Initial_Git.bundle` file is a backup of the prepared commit history if a ZIP utility drops hidden files.

## Continue with ChatGPT

The GitHub app is already connected to ChatGPT, but the new repository may need to be selected in GitHub app installation permissions.

Open a new chat and say:

> Continue development of `aliinreallife/the-mage` from GitHub. Read `AGENTS.md`, `docs/PROJECT-ROADMAP.md`, `docs/PHASE1-STATUS.md`, and `docs/reference/HANDOFF.md`. Audit the latest source and CI; prioritize Android playtesting readiness and verified 0.9941 progression-data import. Make changes incrementally, with tests, and don't change production balance without verified evidence.

In the absence of connected GitHub repository access, upload a current source ZIP as a fallback. The GitHub repo should be the canonical source going forward.
