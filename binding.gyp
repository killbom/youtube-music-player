{
  "targets": [
    {
      "target_name": "media-service",
      "include_dirs" : [
        "<!(node -e \"require('nan')\")"
      ],
      "conditions": [
        ["OS==\"mac\"", {
          "sources": [
            "lib/darwin/module.mm",
            "lib/darwin/service.mm"
          ],
          "libraries": [ "-framework Foundation -framework AppKit -framework MediaPlayer" ]
        }]
      ]
    }
  ]
}