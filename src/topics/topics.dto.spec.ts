import { BadRequestException } from '@nestjs/common';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  createTopicSchema,
  listTopicsQuerySchema,
  TOPIC_NAME_MAX,
  updateTopicSchema,
} from './topics.dto.js';

describe('topic DTOs', () => {
  it('trims the name and leaves description optional', () => {
    const pipe = new ZodValidationPipe(createTopicSchema);
    expect(pipe.transform({ name: '  主題  ' })).toEqual({ name: '主題' });
  });

  it('rejects blank or overly long names', () => {
    const pipe = new ZodValidationPipe(createTopicSchema);
    expect(() => pipe.transform({ name: '  ' })).toThrow(BadRequestException);
    expect(() =>
      pipe.transform({ name: 'a'.repeat(TOPIC_NAME_MAX + 1) }),
    ).toThrow(BadRequestException);
  });

  it('allows clearing the description but requires at least one field', () => {
    expect(updateTopicSchema.parse({ description: '' })).toEqual({
      description: '',
    });
    expect(updateTopicSchema.safeParse({}).success).toBe(false);
  });

  it('defaults the list scope to all', () => {
    expect(listTopicsQuerySchema.parse({})).toEqual({ scope: 'all' });
  });
});
