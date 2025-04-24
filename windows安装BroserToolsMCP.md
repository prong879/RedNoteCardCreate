
运行
```cmd
npm install -g @agentdeskai/browser-tools-mcp@1.2.0
npm install -g @agentdeskai/browser-tools-server@1.2.0
```

`mcp.json` 中配置为
```json
        "browser-tools-mcp": {
            "command": "cmd",
            "args": [
                "/c",
                "npx",
                "-y",
                "@agentdeskai/browser-tools-mcp@1.2.0"
            ]
        }
```

终端运行
```cmd
npx @agentdeskai/browser-tools-server@1.2.0
```
