storage "file" {
  path = "/vault/file"  # the image's built-in dir, owned by the vault user at build
                         # time — a custom path here would sit on a fresh Docker
                         # volume owned by root, which the vault user can't write to
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = true   # lab only — never do this in a real deployment
}

ui = true
