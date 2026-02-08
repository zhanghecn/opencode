

我现在需要你参考 opencode web 做个专项 doc-demo 。

# 需求
用户拖入一个 ppt 或者 pdf  excel docx 或者 图片。
然后用户一般会问一个生成什么报告或者文档的提示词 
接下来就会生成文档或者报告文件。

# 背景
为什么我要用opencode的通用智能体进行改造专属agent

因为这并不是很简单的任务,大模型上下文有限制。
用户输入的pdf 很有可能有100M 的大小。
且输出内容很有可能需要非常长的汇总。

需要支持海量搜索、长文写作、批量处理。

并且这只是其中一个业务需求,一个通用型智能体非常重要,因为本身就支持海量代码库的搜索,和批量写入。

opencode 是一个通用智能体。 
可以方便自定义构建智能体 里面自带拥有一些工具和命令 
并且可以定义 模型 和 agent 。
还支持 plugin 和 skill 集成

你不要盲目的使用 opencode server ,后续我会进行改造的,而且我并没有编译。

sdk 是拥有 server 的。 而且我更多时候也会调试 server 修改源码。 你帮我想个办法,我并知道如何正规的运行这个项目。


# 深入了解代码
opencode 中的 
sdk core tool plugin skills 

只有了解这些 你才知道如何配置自定义agent 



# 实现要求 

## 前端分离
opencode web 是 自动启动一个 server 但我这里不允许,我需要的是前后端分离。
服务器可以任意跑server。 而我目前实现的 doc-demo 需要您在实现客户端web界面的时候 做到分离的效果。
在vite 环境配置好 server 地址就能直接启动

## 关于页面需求
由于是参考 opencode web 那就简单了,做减法就行 以及一些细微改动
1. 保留左边问答框
2. 保留中间执行流程显示 以及 点击文件的显示
3. 保留右侧 "所有文件"
4. 去掉自定义选择目录
5. 去掉自定义选择链接服务器

## agent 自定义配置

### 工作目录 
工作目录 需要在 doc-coauthoring 项目中提取预设好 不允许更改工作目录

### skill 目录
默认指定一个目录作为 加载 skills 的地方 到时候把 doc-coauthoring 的skill copy 这个目录 来优化报告文档的效果

### agent 默认配置
在通过 sdk 调用 opencode server 时候配置下面: 
- 只运行启动服务的目录 进行写入 读取 等权限 
- 默认所有写入 读取 执行权限都有,不需要用户确认。 只不过限制在目录中
- 默认使用的模型和 key 也要提前配置好 
- 默认开启max 最大思考模式

### 文档处理 
所有 文档建议都提前处理成 markdown,方便检索。

关于 pdf 解析,需要借助到 paddle-v1.5 下面是示例代码:
```
# Please make sure the requests library is installed
# pip install requests
import base64
import os
import requests

API_URL = "https://k8gdt1ufl572x978.aistudio-app.com/layout-parsing"
TOKEN = "fe241ccb20bf0c4856b0c8063e4aff1abe7305dd"

file_path = "<local file path>"

with open(file_path, "rb") as file:
    file_bytes = file.read()
    file_data = base64.b64encode(file_bytes).decode("ascii")

headers = {
    "Authorization": f"token {TOKEN}",
    "Content-Type": "application/json"
}

required_payload = {
    "file": file_data,
    "fileType": <file type>,  # For PDF documents, set `fileType` to 0; for images, set `fileType` to 1
}

optional_payload = {
    "useDocOrientationClassify": False,
    "useDocUnwarping": False,
    "useChartRecognition": False,
}

payload = {**required_payload, **optional_payload}

response = requests.post(API_URL, json=payload, headers=headers)
print(response.status_code)
assert response.status_code == 200
result = response.json()["result"]

output_dir = "output"
os.makedirs(output_dir, exist_ok=True)

for i, res in enumerate(result["layoutParsingResults"]):
    md_filename = os.path.join(output_dir, f"doc_{i}.md")
    with open(md_filename, "w") as md_file:
        md_file.write(res["markdown"]["text"])
    print(f"Markdown document saved at {md_filename}")
    for img_path, img in res["markdown"]["images"].items():
        full_img_path = os.path.join(output_dir, img_path)
        os.makedirs(os.path.dirname(full_img_path), exist_ok=True)
        img_bytes = requests.get(img).content
        with open(full_img_path, "wb") as img_file:
            img_file.write(img_bytes)
        print(f"Image saved to: {full_img_path}")
    for img_name, img in res["outputImages"].items():
        img_response = requests.get(img)
        if img_response.status_code == 200:
            # Save image to local
            filename = os.path.join(output_dir, f"{img_name}_{i}.jpg")
            with open(filename, "wb") as f:
                f.write(img_response.content)
            print(f"Image saved to: {filename}")
        else:
            print(f"Failed to download image, status code: {img_response.status_code}")
```

它可以 转成 markdown 并能够提取出 图片 。 您需要先将他们自动解析放在文件系统中

