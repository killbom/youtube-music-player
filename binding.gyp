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
            "lib/media-control/darwin/module.mm",
            "lib/media-control/darwin/service.mm"
          ],
          "libraries": [ "-framework Foundation -framework AppKit -framework MediaPlayer" ]
        }]
      ]
    }
  ]
}