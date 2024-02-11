  import {listen} from "@plasmohq/messaging/message"

listen(async (_req, res) => {
  const html = window.document.documentElement.innerHTML
  const description = window.document.querySelector("meta[name='description']")?.getAttribute("content")

  res.send({
    html,
    description
  })
})  