{
  'targets': [
    {
      'target_name': 'normalize-path',
      'sources': [ 'normalize-path.cc' ],
      'include_dirs': ["<!(node -p \"require('node-addon-api').include_dir\")"],
    }
  ]
}
