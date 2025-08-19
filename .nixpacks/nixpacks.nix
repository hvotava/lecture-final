{ pkgs ? import <nixpkgs> {} }:

let
  nodejs = pkgs.nodejs_18;
  npm = pkgs.nodePackages.npm;
in
pkgs.mkShell {
  buildInputs = [ nodejs npm ];
  
  shellHook = ''
    export PATH="${nodejs}/bin:${npm}/bin:$PATH"
    export NODE_PATH="${nodejs}/lib/node_modules"
  '';
} 