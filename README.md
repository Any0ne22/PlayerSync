<p align="center">
  <img
    width="200"
    src="logo.png"
    alt="WatchTogether"
  />
</p>
<h1 align="center">WatchTogether</h1>
<p align="center">
  Synchronize video players between web browsers
</p>

## Server installation

### Manual installation

Install dependancies

```bash
pip install -r backend/requirements.txt
```

Launch the server

```bash
uvicorn backend.server:app --reload
```

### Docker installation

```bash
docker image build . -t watchtogether
docker run -p "8000:8000" watchtogether
```

## Client installation

Go to extensions settings of any chromium browser and load the extension directory (`WatchTogetherExtension`).

1) Open the Extension Management page by navigating to chrome://extensions.
    - Alternatively, open this page by clicking on the Extensions menu button and selecting Manage Extensions at the bottom of the menu.
    - Alternatively, open this page by clicking on the Chrome menu, hovering over More Tools then selecting Extensions
2) Enable Developer Mode by clicking the toggle switch next to Developer mode.
3) Click the Load unpacked button and select the extension directory.

## Usage

1) Connect the client to your server (Click the extension icon and do to Option)
2) Select the tab with the player you want to sync and join a room
3) Repeat step 2 with any player you want to sync
