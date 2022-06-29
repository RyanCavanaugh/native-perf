#define NAPI_DISABLE_CPP_EXCEPTIONS
#include "napi.h"
#include <stdlib.h>
#include <stack>
#include <vector>

Napi::String NormalizeSlashes(const Napi::CallbackInfo &info)
{
  Napi::String path = info[0].As<Napi::String>();
  std::u16string str = path.Utf16Value();
  int n = str.length();
  for (int i = 0; i < n; i++) {
    if (str[i] == '\\') {
      str[i] = '/';
    }
  }
  return Napi::String::New(info.Env(), str);
}

Napi::String NormalizePath(const Napi::CallbackInfo &info)
{
  Napi::String path = info[0].As<Napi::String>();
  std::u16string str = path.Utf16Value();
  std::stack<int> separatorPositions;
  int len = str.length();
  int cursor = 0;
  std::vector<char16_t> outputChars(len, 0);

  for (int i = 0; i < len; i++)
  {
    if ((str[i] == '\\') || (str[i] == '/'))
    {
        outputChars[cursor] = '/';
        separatorPositions.push(cursor);
        cursor++;
        continue;
    }
    
    if ((i + 2 < len) &&
        (str[i] == '.') &&
        (str[i + 1] == '.') &&
        ((str[i + 2] == '\\') || (str[i + 2] == '/'))) {

        i += 2;
        separatorPositions.pop();
        cursor = separatorPositions.top() + 1;
        separatorPositions.pop();
        separatorPositions.push(cursor);
        continue;
    }
    outputChars[cursor] = str[i];
    cursor++;
  }

  outputChars.resize(cursor);
  std::u16string result = std::u16string(outputChars.begin(), outputChars.end());

  return Napi::String::New(info.Env(), result);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("normalizeSlashes", Napi::Function::New(env, NormalizeSlashes));
  exports.Set("normalizePath", Napi::Function::New(env, NormalizePath));
  return exports;
}

NODE_API_MODULE(hello, Init)
