// ignore_for_file: file_names, constant_identifier_names, non_constant_identifier_names, avoid_print

import 'dart:convert';
import 'dart:developer';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:http/http.dart' as http;
import 'package:internet_connection_checker/internet_connection_checker.dart';

import '/core/local/local_data.dart';

enum RequestMethod { GET, POST, PUT, PATCH, PUT_V2, MULTIPART, DELETE }

class NetworkConfig {
  static const String _jsonContentType = "application/json";
  static const String _multipartContentType = "multipart/form-data";
  static const String _acceptType = "application/json";

  static const Set<int> _successStatusCodes = {200, 201};

  Future<Map<String, dynamic>?> apiRequestHandler(
    RequestMethod method,
    String url,
    String? jsonBody, {
    bool isAuth = false,
    String imagePath = "",
    String dataPathName = "data",
    String filePathName = "image",
  }) async {
    if (!await InternetConnectionChecker().hasConnection) {
      _showNoInternetToast();
      return null;
    }

    try {
      final headers = await _buildHeaders(isAuth, method);

      switch (method) {
        case RequestMethod.GET:
          return await _handleGetRequest(url, headers);
        case RequestMethod.POST:
          return await _handlePostRequest(url, headers, jsonBody);
        case RequestMethod.PATCH:
          return await _handlePatchRequest(url, headers, jsonBody);
        case RequestMethod.PUT:
          return await _handlePutRequest(url, headers, jsonBody);
        case RequestMethod.DELETE:
          return await _handleDeleteRequest(url, headers);
        case RequestMethod.MULTIPART:
          return await _handleMultipartRequest(
            url,
            jsonBody,
            imagePath,
            dataPathName,
            filePathName,
          );
        case RequestMethod.PUT_V2:
          return await _handlePutV2Request(url, headers, jsonBody);
      }
    } catch (e) {
      _showError(e);
      return null;
    }
  }

  Future<Map<String, String>> _buildHeaders(
    bool isAuth,
    RequestMethod method,
  ) async {
    final headers = <String, String>{"Content-type": _jsonContentType};

    if (isAuth || method == RequestMethod.MULTIPART) {
      final localService = LocalService();
      final token = await localService.getValue(PreferenceKey.token);
      if (token != null) {
        headers["Authorization"] = token;
      }
    }

    return headers;
  }

  Future<Map<String, dynamic>?> _handleGetRequest(
    String url,
    Map<String, String> headers,
  ) async {
    final response = await http.get(Uri.parse(url), headers: headers);
    return _processResponse(response);
  }

  Future<Map<String, dynamic>?> _handlePostRequest(
    String url,
    Map<String, String> headers,
    String? jsonBody,
  ) async {
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonBody,
    );
    return _processResponse(response, handleSpecialCases: true);
  }

  Future<Map<String, dynamic>?> _handlePatchRequest(
    String url,
    Map<String, String> headers,
    String? jsonBody,
  ) async {
    final response = await http.patch(
      Uri.parse(url),
      headers: headers,
      body: jsonBody,
    );
    return _processResponse(response);
  }

  Future<Map<String, dynamic>?> _handlePutRequest(
    String url,
    Map<String, String> headers,
    String? jsonBody,
  ) async {
    final response = await http.put(
      Uri.parse(url),
      headers: headers,
      body: jsonBody,
    );
    return _processResponse(response);
  }

  Future<Map<String, dynamic>?> _handleDeleteRequest(
    String url,
    Map<String, String> headers,
  ) async {
    final response = await http.delete(Uri.parse(url), headers: headers);
    return _processResponse(response);
  }

  Future<Map<String, dynamic>?> _handleMultipartRequest(
    String url,
    String? jsonBody,
    String imagePath,
    String dataPathName,
    String filePathName,
  ) async {
    final localService = LocalService();
    final token = await localService.getValue(PreferenceKey.token);

    final request = http.MultipartRequest('POST', Uri.parse(url));
    request.headers.addAll({
      'Content-Type': _multipartContentType,
      'Accept': _acceptType,
      if (token != null) 'Authorization': token,
    });

    if (jsonBody != null) {
      request.fields[dataPathName] = jsonBody;
    }

    if (imagePath.isNotEmpty) {
      await _addImageToRequest(request, imagePath, filePathName);
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    return _processResponse(response);
  }

  Future<void> _addImageToRequest(
    http.MultipartRequest request,
    String imagePath,
    String filePathName,
  ) async {
    final imageFile = File(imagePath);
    if (await imageFile.exists()) {
      request.files.add(
        await http.MultipartFile.fromPath(
          filePathName,
          imagePath,
          filename: 'img_${DateTime.now().millisecondsSinceEpoch}.jpg',
        ),
      );
      log("Image file added to request: $imagePath");
    }
  }

  Future<Map<String, dynamic>?> _handlePutV2Request(
    String url,
    Map<String, String> headers,
    String? jsonBody,
  ) async {
    // This PUT request is for updating certain fields in a multipart request.
    final request = http.MultipartRequest("PUT", Uri.parse(url));
    request.headers.addAll(headers);

    if (jsonBody != null) {
      request.fields["data"] = jsonBody;
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);
    print("PUT response: ${response.statusCode}");
    print(response.body);

    return _processResponse(response);
  }

  Map<String, dynamic>? _processResponse(
    http.Response response, {
    bool handleSpecialCases = false,
  }) {
    print(response.body);
    print(response.statusCode);

    if (_successStatusCodes.contains(response.statusCode)) {
      return json.decode(response.body);
    }

    if (handleSpecialCases && response.statusCode == 500) {
      throw Exception("Server Error");
    } else if (handleSpecialCases) {
      throw Exception('Try again after some time');
    } else {
      throw Exception("Server Error");
    }
  }

  void _showNoInternetToast() {
    Fluttertoast.showToast(msg: "Please Connect Internet");
  }

  void _showError(dynamic error) {
    Fluttertoast.showToast(
      msg: error.toString(),
      backgroundColor: Colors.red,
      textColor: Colors.white,
    );
  }
}
