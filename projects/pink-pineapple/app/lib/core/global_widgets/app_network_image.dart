import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import '/core/global_widgets/app_loading.dart';

enum ImageShape { roundedRectangle, circle }

class ResponsiveNetworkImage extends StatelessWidget {
  final String imageUrl;
  final ImageShape shape;
  final double borderRadius; // used only if shape is roundedRectangle
  final double? widthPercent; // width as % of screen width (0 to 1)
  final double? heightPercent; // height as % of screen height (0 to 1)
  final BoxFit fit;
  final Widget? placeholderWidget;
  final Widget? errorWidget;

  const ResponsiveNetworkImage({
    Key? key,
    required this.imageUrl,
    this.shape = ImageShape.roundedRectangle,
    this.borderRadius = 8.0,
    this.widthPercent,
    this.heightPercent,
    this.fit = BoxFit.cover,
    this.placeholderWidget,
    this.errorWidget,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final screenSize = MediaQuery.of(context).size;
    final width =
        widthPercent != null ? screenSize.width * widthPercent! : null;
    final height =
        heightPercent != null ? screenSize.height * heightPercent! : null;

    Widget image = CachedNetworkImage(
      imageUrl: imageUrl,
      width: width,
      height: height,
      fit: fit,
      placeholder:
          (context, url) =>
              placeholderWidget ??
              Container(
                width: width ?? double.infinity,
                height: height ?? double.infinity,
                color: Colors.transparent,
                child: Center(child: loading()),
              ),
      errorWidget:
          (context, url, error) =>
              errorWidget ??
              Container(
                width: width ?? double.infinity,
                height: height ?? double.infinity,
                color: Colors.grey[800],
                child: const Center(
                  child: Icon(Icons.image, color: Colors.white, size: 40),
                ),
              ),
    );

    switch (shape) {
      case ImageShape.circle:
        return ClipOval(child: image);
      case ImageShape.roundedRectangle:
      default:
        return ClipRRect(
          borderRadius: BorderRadius.circular(borderRadius),
          child: image,
        );
    }
  }
}

/*
-----Rounded rectangle responsive width 90% screen width, height 20% screen height
ResponsiveNetworkImage(
  imageUrl: shop.coverImage,
  shape: ImageShape.roundedRectangle,
  borderRadius: 12,
  widthPercent: 0.9,
  heightPercent: 0.2,
  fit: BoxFit.cover,
  placeholderWidget: loaderCubeGrid(),
),

------Circle avatar with diameter 30% of screen width
ResponsiveNetworkImage(
  imageUrl: user.profileImage,
  shape: ImageShape.circle,
  widthPercent: 0.3,
  heightPercent: 0.3,
  fit: BoxFit.cover,
),


*/
