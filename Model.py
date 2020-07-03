from __future__ import print_function

# packages for neural networks with PyTorch
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim   # efficient gradient descents

# load and display images
from PIL import Image
import matplotlib.pyplot as plt

import torchvision.transforms as transforms  # trans PIL imgs into tensors
import torchvision.models as models  # train/load pre-trained models

import copy  # to deep copy models

from LossFunctions import ContentLoss
from LossFunctions import StyleLoss

# create a module to normalize input image so we can easily put it in a
# nn.Sequential


class Normalization(nn.Module):
    def __init__(self, mean, std):
        super(Normalization, self).__init__()
        # .view the mean and std to make them [C x 1 x 1] so that they can
        # directly work with image Tensor of shape [B x C x H x W].
        # B is batch size. C is number of channels. H is height and W is width.
        self.mean = torch.tensor(mean).view(-1, 1, 1)
        self.std = torch.tensor(std).view(-1, 1, 1)

    def forward(self, img):
        # normalize img
        return (img - self.mean) / self.std


class StyleModel:
    def __init__(self, device, cnn, normalization_mean, normalization_std, style_img, content_img, style_layers, content_layers):
        self.device = device
        self.cnn = cnn
        self.normalization_mean = normalization_mean
        self.normalization_std = normalization_std
        self.style_img = style_img
        self.content_img = content_img
        self.style_layers = style_layers
        self.content_layers = content_layers

    def get_style_model_and_losses(self):
        cnn = copy.deepcopy(self.cnn)

        # normalization module
        normalization = Normalization(
            self.normalization_mean, self.normalization_std).to(self.device)

        # just in order to have an iterable access to or list of content/style
        # lossess
        content_losses = []
        style_losses = []

        # assuming that cnn is a nn.Sequential, so we make a new nn.Sequential
        # to put in modules that are supposed to be activated sequentially
        model = nn.Sequential(normalization)

        i = 0  # increment every time we see a conv
        for layer in cnn.children():
            if isinstance(layer, nn.Conv2d):
                i += 1
                name = 'conv_{}'.format(i)
            elif isinstance(layer, nn.ReLU):
                name = 'relu_{}'.format(i)
                # The in-place version doesn't play
                # very nicely with the ContentLoss
                # and StyleLoss we insert below. So we replace with out-of-place
                # ones here.
                layer = nn.ReLU(inplace=False)
            elif isinstance(layer, nn.MaxPool2d):
                name = 'pool_{}'.format(i)
            elif isinstance(layer, nn.BatchNorm2d):
                name = 'bn_{}'.format(i)
            else:
                raise RuntimeError('Unrecognized layer: {}'.format(
                    layer.__class__.__name__))

            model.add_module(name, layer)

            if name in self.content_layers:
                # add content loss:
                target = model(self.content_img).detach()
                content_loss = ContentLoss(target)
                model.add_module("content_loss_{}".format(i), content_loss)
                content_losses.append(content_loss)

            if name in self.style_layers:
                # add style loss:
                target_feature = model(self.style_img).detach()
                style_loss = StyleLoss(target_feature)
                model.add_module("style_loss_{}".format(i), style_loss)
                style_losses.append(style_loss)

        # now we trim off the layers after
        # the last content and style losses
        for i in range(len(model) - 1, -1, -1):
            if isinstance(model[i], ContentLoss) or isinstance(model[i], StyleLoss):
                break

        model = model[:(i + 1)]

        return model, style_losses, content_losses

    def get_input_optimizer(self, input_img):
        # this line to show that input is a parameter that requires a gradient
        optimizer = optim.LBFGS([input_img.requires_grad_()])
        return optimizer

    def run_style_transfer(self, input_img, num_steps=300,
                           style_weight=1000000, content_weight=1):
        """Run the style transfer."""
        print('Building the style transfer model..')
        model, style_losses, content_losses = self.get_style_model_and_losses()
        optimizer = self.get_input_optimizer(input_img)

        print('Optimizing..')
        run = [0]
        while run[0] <= num_steps:

            def closure():
                # correct the values of updated input image
                input_img.data.clamp_(0, 1)

                optimizer.zero_grad()
                model(input_img)
                style_score = 0
                content_score = 0

                for sl in style_losses:
                    style_score += sl.loss
                for cl in content_losses:
                    content_score += cl.loss

                style_score *= style_weight
                content_score *= content_weight

                loss = style_score + content_score
                loss.backward()

                run[0] += 1
                if run[0] % 5 == 0:
                    print("run {}:".format(run))
                    print('Style Loss : {:4f} Content Loss: {:4f}'.format(
                        style_score.item(), content_score.item()))
                    print()
                    # imshow(input_img, title='Run {}'.format(run))
                    # imsave('run/run{}.jpg'.format(run), input_img)
                return style_score + content_score
            optimizer.step(closure)
        # a last correction...
        input_img.data.clamp_(0, 1)
        return input_img
