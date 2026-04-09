// ignore_for_file: file_names, constant_identifier_names, non_constant_identifier_names, avoid_print

import 'dart:convert';
import 'dart:developer';
import 'dart:io';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:internet_connection_checker/internet_connection_checker.dart';
import 'package:http/http.dart' as http;
import '/core/global_widgets/app_snackbar.dart';
import '/core/local/local_data.dart';
import 'package:path/path.dart' as p;

enum RequestMethod { GET, POST, PUT, PATCH, PUT_V2, MULTIPART, DELETE }

class NetworkConfigV1 {
  Future ApiRequestHandler(
    RequestMethod method,
    url,
    json_body, {
    is_auth = false,
    imagePath = "",
    dataPathName = "data",
    filePathName = "image",
  }) async {
    if (await InternetConnectionChecker().hasConnection) {
      var header = <String, String>{"Content-type": "application/json"};
      if (is_auth == true) {
        var localService = LocalService();
        String? token = await localService.getValue<String>(
          PreferenceKey.token,
        );
        header["Authorization"] = token!;
        //    header["Authorization"] =
        //"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YWJmYmExMTFhNGJmY2NiNGQ1NWNkYiIsImVtYWlsIjoiYWRtaW5AZ21haWwuY29tIiwicm9sZSI6IkFETUlOIiwiY29tbW9uSWQiOiI2OGFiZmJhMTUwYTE3Zjc3ZjI1NWIxYzUiLCJpYXQiOjE3NTYxMDM0OTgsImV4cCI6MTc1ODY5NTQ5OH0.ly_zxx_QJrIDR28zHldu1OlwMUemVBKXhG-KDSN6yAM";
        // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTZjNWFjMzFmMDYyMTVjNjRiNjg2YSIsImVtYWlsIjoicm9tZUBpZG9pZHJhdy5jb20iLCJyb2xlIjoiVVNFUiIsImlhdCI6MTc1NjM3MjQyMSwiZXhwIjoxNzU4OTY0NDIxfQ.YS9b_gZx5wFB41zoAtJoNhac8meKXBYTh7thrcdbndg";
      }
      if (method.name == RequestMethod.GET.name) {
        try {
          var req = await http.get(Uri.parse(url), headers: header);
          print(req.body);
          print(req.statusCode);
          if (req.statusCode == 200 || req.statusCode == 201) {
            return json.decode(req.body);
          } else {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          }
        } catch (e) {
          // ShowError(e);
        }
      } else if (method.name == RequestMethod.POST.name) {
        try {
          var req = await http.post(
            Uri.parse(url),
            headers: header,
            body: json_body,
          );

          print(req.body);
          print(req.statusCode);

          if (req.statusCode == 200 || req.statusCode == 201) {
            return json.decode(req.body);
          } else if (req.statusCode == 500) {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          } else {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Try again after some time';
            ShowError(errorMsg);
            // throw Exception('Try aging after some time');
          }
        } catch (e) {
          // ShowError(e);
        }
      } else if (method.name == RequestMethod.PATCH.name) {
        try {
          var req = await http.patch(
            Uri.parse(url),
            headers: header,
            body: json_body,
          );
          print(req.statusCode);
          if (req.statusCode == 200 || req.statusCode == 201) {
            return json.decode(req.body);
          } else {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          }
        } catch (e) {
          // ShowError(e);
        }
      } else if (method.name == RequestMethod.PUT.name) {
        try {
          var req = await http.put(
            Uri.parse(url),
            headers: header,
            body: json_body,
          );
          print(req.statusCode);
          if (req.statusCode == 200 || req.statusCode == 201) {
            return json.decode(req.body);
          } else {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          }
        } catch (e) {
          // ShowError(e);
        }
      } else if (method.name == RequestMethod.MULTIPART.name) {
        final localService = LocalService();
        final token = await localService.getValue<String>(PreferenceKey.token);

        try {
          final request = http.MultipartRequest('POST', Uri.parse(url));
          request.headers.addAll({
            'Accept': 'application/json',
            // If your API uses Bearer:
            // if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
            if (token != null && token.isNotEmpty) 'Authorization': token,
          });

          // JSON payload
          final String dataFieldName = (dataPathName ?? 'data');
          final String dataPayload = (json_body.isNotEmpty ? json_body : '{}');
          request.fields[dataFieldName] = dataPayload;
          print('📤 Data field "$dataFieldName": $dataPayload');

          // Normalize files
          final List<File> files = imagePath is List<File>
              ? imagePath
              : imagePath is Iterable
              ? List<File>.from(imagePath)
              : <File>[];

          print('📸 Files to upload: ${files.length}');
          for (var f in files) {
            print('  - ${f.path} (exists: ${await f.exists()})');
          }

          // IMPORTANT: field name must match Multer: 'photos'
          final String fieldName = (filePathName ?? 'photos');

          for (var i = 0; i < files.length; i++) {
            final file = files[i];
            if (!await file.exists()) {
              print('❌ File not found: ${file.path}');
              continue;
            }

            final filename = p.basename(file.path);
            final part = await http.MultipartFile.fromPath(
              fieldName, // <-- "photos" for every file
              file.path,
              filename: filename,
              // contentType: MediaType('image','jpeg'), // optional
            );

            request.files.add(part);
            print('✅ Added file #$i -> field="$fieldName", name="$filename"');
          }

          print('📦 Total files in request: ${request.files.length}');

          final streamed = await request.send();
          final response = await http.Response.fromStream(streamed);

          print('📥 Response status: ${response.statusCode}');
          print('📥 Response body: ${response.body}');

          if (response.statusCode >= 200 && response.statusCode < 300) {
            return json.decode(response.body);
          } else {
            try {
              final data = json.decode(response.body);
              ShowError(data['message'] ?? 'Server Error');
              return data;
            } catch (_) {
              ShowError('Server Error (${response.statusCode})');
              return null;
            }
          }
        } catch (e, st) {
          log('Multipart upload error: $e\n$st');
          ShowError('Upload failed');
          return null;
        }
      } else if (method.name == RequestMethod.PUT_V2.name) {
        try {
          // this put request to is for only to update certain field in a multipart request.
          /*
          EXAMPLE USAGE
           final Map<String, dynamic> requestBody = {"age": selectedAge.value};
          final response = await _networkConfig.ApiRequestHandler(
            RequestMethod.PUT_V2,
            Urls.profile,
            json.encode(requestBody),
            is_auth: true,
          );
          */
          var request = http.MultipartRequest("PUT", Uri.parse(url));
          request.headers.addAll(header);

          if (json_body != null) {
            request.fields["data"] = json_body;
          }
          var streamedResponse = await request.send();
          var response = await http.Response.fromStream(streamedResponse);
          print("PUT response: ${response.statusCode}");
          print(response.body);
          if (response.statusCode == 200 || response.statusCode == 201) {
            return json.decode(response.body);
          } else {
            final data = json.decode(response.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          }
        } catch (e) {
          // ShowError(e);
        }
      } else if (method.name == RequestMethod.DELETE.name) {
        try {
          var req = await http.delete(Uri.parse(url), headers: header);

          print(req.statusCode);
          print(req);
          if (req.statusCode == 200 || req.statusCode == 201) {
            return json.decode(req.body);
          } else {
            final data = json.decode(req.body); // decode to Map
            var errorMsg = data['message'] ?? 'Server Error';
            ShowError(errorMsg);
          }
        } catch (e) {
          // ShowError(e);
        }
      }
    } else {
      Fluttertoast.showToast(msg: "Please Connect Internet");
    }
  }

  ShowError(msg) {
    AppSnackbar.showError(msg);
  }
}
